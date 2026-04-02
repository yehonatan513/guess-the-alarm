import { useEffect, useRef } from "react";
import { ref, get, update, runTransaction, query, orderByChild, equalTo } from "firebase/database";
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
  todayCount: number,
  now: Date
): "win" | "loss" | null {
  const betCreatedMs = new Date(bet.created_at).getTime();
  const endTime = getBetEndTime(bet.type, betCreatedMs);
  const isExpired = now.getTime() >= endTime;

  const hasAlertInWindow = (startMs: number, endMs: number, condition?: (a: Alert) => boolean) =>
    alerts.some((a) => {
      const t = new Date(a.time).getTime();
      if (t <= startMs || t >= endMs) return false;
      if (condition && !condition(a)) return false;
      return true;
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
              if (max !== null && count > max) return "loss";
              if (isExpired) {
                return count >= min! && (max === null || count <= max) ? "win" : "loss";
              }
              return null;
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

  const runResolution = async () => {
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
      const updates: Record<string, any> = {};
      let coinsToAdd = 0;
      let wins = 0;
      let losses = 0;

      for (const [betId, bet] of Object.entries(bets)) {
        if (bet.status !== "open") continue;

        const result = computeResult(bet, betId, currentAlerts, currentTodayCount, now);

        if (result) {
          const winnings = result === "win" ? Math.floor(bet.amount * bet.multiplier) : 0;
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
        await update(ref(db), updates);

        // ── Fix #4: Use runTransaction to prevent race conditions on coins ──
        if (coinsToAdd > 0) {
          await runTransaction(ref(db, `users/${user.uid}/coins`), (current) => {
            return (current || 0) + coinsToAdd;
          });
          // Also update leaderboard — read the new total
          const newCoinsSnap = await get(ref(db, `users/${user.uid}/coins`));
          const newCoins = newCoinsSnap.val() as number;
          await update(ref(db, `leaderboard/${user.uid}`), { coins: newCoins });

          // Update local profile state to reflect new coins
          await updateCoins(newCoins);
        }

        if (wins > 0 || losses > 0) {
          await update(ref(db, `users/${user.uid}`), {
            wins: (currentProfile.wins || 0) + wins,
            losses: (currentProfile.losses || 0) + losses,
          });
        }

        if (wins > 0) {
          toast.success(`🎉 ניצחת ${wins} הימור${wins > 1 ? "ים" : ""}!`, {
            description: `+${coinsToAdd.toLocaleString("he-IL")} מטבעות`,
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

  // Periodic check every 30s
  useEffect(() => {
    if (!user) return;
    runResolution();
    const interval = setInterval(runResolution, 30000);
    return () => clearInterval(interval);
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also resolve immediately whenever alerts change (with debounce)
  useEffect(() => {
    if (!user) return;
    if (alerts.length === 0) return;
    
    // Debounce to prevent multiple rapid calls
    const timeout = setTimeout(() => {
      runResolution();
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [alerts, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps
}
