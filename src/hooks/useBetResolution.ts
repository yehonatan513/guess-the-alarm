import { useEffect, useRef } from "react";
import { ref, get, update, runTransaction, query, orderByChild, equalTo, push } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { parseBetId, alertMatchesLocation, getBetEndTime } from "@/lib/bet-generator";

interface Alert {
  id: string;
  areas: string[];
  time: string;
  type: string;
}

interface BetResolutionInput {
  alerts: Alert[];
  activeAlerts: Alert[];
  todayCount: number;
}

interface FirebaseBet {
  uid: string;
  username: string;
  type: string;
  description: string;
  amount: number;
  multiplier: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
  coins_won: number;
}

// ── Shared resolution logic (used by both interval and quick trigger) ─────────
function computeResult(
  bet: FirebaseBet,
  betId: string,
  alerts: Alert[],
  activeAlerts: Alert[],
  todayCount: number,
  now: Date,
  minutesLeftToday: number
): "win" | "loss" | null {
  const betCreatedMs = new Date(bet.created_at).getTime();
  const endTime = getBetEndTime(bet.type, betCreatedMs);
  const isExpired = now.getTime() >= endTime;

  const hasAlertInWindow = (startMs: number, endMs: number, condition?: (a: Alert) => boolean) =>
    alerts.some((a) => {
      try {
        const t = new Date(a.time).getTime();
        if (isNaN(t)) {
          console.warn("Invalid alert time:", a.time);
          return false;
        }
        if (t < startMs || t > endMs) return false;
        if (condition && !condition(a)) return false;
        return true;
      } catch (e) {
        console.error("Error parsing alert time:", e);
        return false;
      }
    });

  switch (bet.type) {
    case "b2":
      if (todayCount > 20) return "win";
      if (isExpired) return "loss";
      return null;

    case "b1": {
      const startNight = endTime - 6 * 60 * 60 * 1000;
      const hasNightDan = hasAlertInWindow(
        startNight, endTime,
        (a) => alertMatchesLocation(a.areas, "region", "גוש דן") || a.areas.some((c) => c.includes("תל אביב"))
      );
      if (hasNightDan) return "win";
      if (isExpired) return "loss";
      return null;
    }

    case "b3": {
      const centralCount = alerts.filter(
        (a) => alertMatchesLocation(a.areas, "region", "גוש דן") || a.areas.some((c) => c.includes("תל אביב"))
      ).length;
      if (centralCount > 10) return "win";
      if (isExpired) return "loss";
      return null;
    }

    case "b4":
    case "b10":
    case "b16": {
      const hasAlert = hasAlertInWindow(betCreatedMs, endTime);
      if (bet.type === "b10") {
        if (hasAlert) return "win";
        if (isExpired) return "loss";
      } else {
        if (hasAlert) return "loss";
        if (isExpired) return "win";
      }
      return null;
    }

    case "b25":
      if (todayCount > 50) return "win";
      if (isExpired) return "loss";
      return null;

    case "b26":
      if (todayCount > 100) return "win";
      if (isExpired) return "loss";
      return null;

    case "b14": {
      const hasTA = alerts.some((a) => a.areas.some((c) => c.includes("תל אביב")));
      if (hasTA) return "win";
      if (isExpired) return "loss";
      return null;
    }

    default: {
      // ── Dynamic bets from BuildBet (IDs contain "|") ─────────────
      if (bet.type.includes("|")) {
        const parsed = parseBetId(bet.type);
        if (parsed) {
          const matchAlert = (areas: string[]) => alertMatchesLocation(areas, parsed.scope, parsed.location);
          const countInLocation = () => alerts.filter((a) => matchAlert(a.areas)).length;

          switch (parsed.type) {
            case "overunder": {
              const count = countInLocation();
              if (parsed.direction === "over") {
                if (count > parsed.threshold!) return "win";
                if (isExpired) return "loss";
              } else {
                if (count > parsed.threshold!) return "loss";
                if (isExpired) return "win";
              }
              return null;
            }

            case "quiet": {
              // High activity check: if > 5 alerts in the first 30 mins, it's a loss
              const first30Min = alerts.filter(a => {
                const t = new Date(a.time).getTime();
                return t >= betCreatedMs && t <= betCreatedMs + (30 * 60 * 1000) && matchAlert(a.areas);
              }).length;
              if (first30Min > 5) return "loss";

              const hasActiveAlert = activeAlerts.some((a) => matchAlert(a.areas));
              if (hasActiveAlert) return "loss";

              const hasAlert = hasAlertInWindow(betCreatedMs, endTime, (a) => matchAlert(a.areas));
              if (hasAlert) return "loss";
              if (isExpired) return "win";
              return null;
            }

            case "night": {
              const startNight = endTime - 6 * 60 * 60 * 1000;
              const hasNight = hasAlertInWindow(startNight, endTime, (a) => matchAlert(a.areas));
              const direction = parsed.direction;
              if (direction === "yes") {
                if (hasNight) return "win";
                if (isExpired) return "loss";
              } else {
                if (hasNight) return "loss";
                if (isExpired) return "win";
              }
              return null;
            }

            case "total": {
              const count = countInLocation();
              const { min, max } = parsed;
              const effectiveMax = max !== null ? max : Infinity;

              // Check if already exceeded range
              if (count > effectiveMax) return "loss";
              
              // If time is up and still below min
              if (isExpired && count < min!) return "loss";
              
              // If still have time and within range, wait
              if (!isExpired) return null;
              
              // Time is up and in range
              return (count >= min! && count <= effectiveMax) ? "win" : "loss";
            }
          }
        }
      }
      if (isExpired) return "loss";
      return null;
    }
  }
}

// Accept alert data as params instead of calling useAlerts() again (prevents double polling)
export function useBetResolution({ alerts, activeAlerts, todayCount }: BetResolutionInput) {
  const { user, profile, updateCoins } = useAuth();
  const processingRef = useRef(false);

  // Store latest values in refs so the interval callback always has fresh data
  const alertsRef = useRef(alerts);
  const todayCountRef = useRef(todayCount);
  alertsRef.current = alerts;
  todayCountRef.current = todayCount;

  const profileRef = useRef(profile);
  profileRef.current = profile;

  const runResolutionFn = async () => {
    if (processingRef.current) return;
    const currentProfile = profileRef.current;
    if (!currentProfile || !user) return;

    processingRef.current = true;

    const currentAlerts = alertsRef.current;
    const currentTodayCount = todayCountRef.current;

    try {
      const betsRef = query(ref(db, "bets"), orderByChild("uid"), equalTo(user.uid));
      const snap = await get(betsRef);
      if (!snap.exists()) { processingRef.current = false; return; }

      const bets = snap.val() as Record<string, FirebaseBet>;
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const minutesLeftToday = Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 60000));

      const updates: Record<string, string | number | null> = {};
      let coinsToAdd = 0;
      let wins = 0;
      let losses = 0;

      for (const [betId, bet] of Object.entries(bets)) {
        if (bet.status !== "open") continue;

        const result = computeResult(bet, betId, currentAlerts, activeAlerts, currentTodayCount, now, minutesLeftToday);

        if (result) {
          const winnings = result === "win" ? Math.round(bet.amount * bet.multiplier) : 0;
          updates[`bets/${betId}/status`] = result === "win" ? "won" : "lost";
          updates[`bets/${betId}/resolved_at`] = now.toISOString();
          updates[`bets/${betId}/coins_won`] = winnings;
          if (result === "win") {
            coinsToAdd += winnings;
            wins++;
          } else {
            losses++;
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        // ── Point 2: Aggregated Resolution ──
        await update(ref(db), updates);

        // ── Point 3: Streak Tracking ──
        // Logic: Any win in this batch increases streak. Any loss resets it.
        // If both? Loss is more significant for gambling balance (reset it).
        let newStreak = currentProfile.consecutive_wins || 0;
        if (losses > 0) {
          newStreak = 0;
        } else if (wins > 0) {
          newStreak += wins;
        }

        // ── Apply coin changes and streak in one go ──
        const finalCoinUpdates: Record<string, string | number | null> = {};
        if (coinsToAdd > 0) {
          await runTransaction(ref(db, `users/${user.uid}/coins`), (current) => (current || 0) + coinsToAdd);
          const newSnap = await get(ref(db, `users/${user.uid}/coins`));
          const newCoins = newSnap.val() as number;
          finalCoinUpdates[`leaderboard/${user.uid}/coins`] = newCoins;
          await updateCoins(newCoins);
        }
        
        finalCoinUpdates[`users/${user.uid}/wins`] = (currentProfile.wins || 0) + wins;
        finalCoinUpdates[`users/${user.uid}/losses`] = (currentProfile.losses || 0) + losses;
        finalCoinUpdates[`users/${user.uid}/consecutive_wins`] = newStreak;
        finalCoinUpdates[`leaderboard/${user.uid}/consecutive_wins`] = newStreak;
        
        await update(ref(db), finalCoinUpdates);

        // ── Resolution History (Point 2 formalization) ──
        await push(ref(db, `resolutions/${user.uid}`), {
          at: now.toISOString(),
          added_coins: coinsToAdd,
          wins,
          losses,
          new_streak: newStreak,
          bet_ids: Object.keys(updates).map(k => k.split("/")[1])
        });

        if (wins > 0) {
          toast.success(`🎉 ניצחת ${wins} הימור${wins > 1 ? "ים" : ""}!`, {
            description: `+${coinsToAdd.toLocaleString("he-IL")} מטבעות | רצף: ${newStreak} 🔥`,
          });
        }
        if (losses > 0) {
          toast.error(`😢 הפסדת ${losses} הימור${losses > 1 ? "ים" : ""}`, {
            description: "בהצלחה בפעם הבאה!",
          });
        }
      }
    } catch (e) {
      console.error("Bet resolution error:", e);
    }

    processingRef.current = false;
  };

  const runResolution = useRef(runResolutionFn);

  // Keep ref up to date
  useEffect(() => {
    runResolution.current = runResolutionFn;
  });

  // Periodic check every 30s
  useEffect(() => {
    if (!user?.uid) return;
    runResolution.current();
    const interval = setInterval(() => runResolution.current(), 30000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  // Also resolve immediately whenever alerts change (with debounce)
  useEffect(() => {
    if (!user?.uid) return;
    if (alerts.length === 0) return;
    
    // Debounce to prevent multiple rapid calls
    const timeout = setTimeout(() => {
      runResolution.current();
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [alerts, user?.uid]);
}
