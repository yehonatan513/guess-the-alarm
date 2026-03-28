import { useEffect, useRef } from "react";
import { ref, get, update, query, orderByChild, equalTo } from "firebase/database";
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

// Accept alert data as params instead of calling useAlerts() again (prevents double polling)
export function useBetResolution({ alerts, activeAlerts, todayCount }: BetResolutionInput) {
  const { user, profile, updateCoins } = useAuth();
  const processingRef = useRef(false);

  // Store latest values in refs so the interval callback always has fresh data
  // without needing to be recreated on every alert update
  const alertsRef = useRef(alerts);
  const activeAlertsRef = useRef(activeAlerts);
  const todayCountRef = useRef(todayCount);

  // Keep refs in sync on every render
  alertsRef.current = alerts;
  activeAlertsRef.current = activeAlerts;
  todayCountRef.current = todayCount;

  // Store profile in ref too so updateCoins always uses the latest value
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    if (!user) return;

    const resolve = async () => {
      if (processingRef.current) return;
      const currentProfile = profileRef.current;
      if (!currentProfile) return;

      processingRef.current = true;

      const alerts = alertsRef.current;
      const activeAlerts = activeAlertsRef.current;
      const todayCount = todayCountRef.current;

      try {
        // Use a query to fetch only the current user's bets instead of the entire database
        const betsRef = query(ref(db, "bets"), orderByChild("uid"), equalTo(user.uid));
        const snap = await get(betsRef);
        if (!snap.exists()) { processingRef.current = false; return; }

        const bets = snap.val() as Record<string, FirebaseBet>;
        const now = new Date();
        const hour = now.getHours();
        const updates: Record<string, any> = {};
        let coinsToAdd = 0;
        let wins = 0;
        let losses = 0;

        for (const [betId, bet] of Object.entries(bets)) {
          if (bet.status !== "open") continue;

          let result: "win" | "loss" | null = null;
          const betCreatedMs = new Date(bet.created_at).getTime();
          const endTime = getBetEndTime(bet.type, betCreatedMs);
          const isExpired = now.getTime() >= endTime;

          switch (bet.type) {
            case "b2": {
              if (todayCount > 20) result = "win";
              else if (isExpired) result = "loss";
              break;
            }
            case "b1": {
              if (hour >= 0 && hour < 6) {
                const allCities = activeAlerts.flatMap(a => a.areas);
                if (allCities.some(c => c.includes("שומר"))) result = "win";
              } else if (isExpired) {
                result = "loss";
              }
              break;
            }
            case "b3": {
              const centralCities = alerts.filter(a =>
                a.areas.some(c =>
                  c.includes("תל אביב") || c.includes("רמת גן") || c.includes("גבעתיים") ||
                  c.includes("בני ברק") || c.includes("חולון") || c.includes("בת ים") ||
                  c.includes("הרצליה") || c.includes("רעננה") || c.includes("כפר סבא") ||
                  c.includes("פתח תקווה") || c.includes("ראשון") || c.includes("רחובות")
                )
              );
              if (centralCities.length > 10) result = "win";
              else if (isExpired) result = "loss";
              break;
            }
            case "b4":
            case "b10":
            case "b16": {
              const delay = bet.type === "b4" ? 60 : bet.type === "b10" ? 5 : 30;
              if (isExpired) {
                const alertsDuringPeriod = alerts.filter(a => {
                  const t = new Date(a.time).getTime();
                  return t > betCreatedMs && t < endTime;
                });
                if (bet.type === "b10") {
                   result = alertsDuringPeriod.length > 0 ? "win" : "loss";
                } else {
                   result = alertsDuringPeriod.length === 0 ? "win" : "loss";
                }
              }
              break;
            }
            case "b25": {
              if (todayCount > 50) result = "win";
              else if (isExpired) result = "loss";
              break;
            }
            case "b26": {
              if (todayCount > 100) result = "win";
              else if (isExpired) result = "loss";
              break;
            }
            case "b14": {
              const allCities = [...alerts, ...activeAlerts].flatMap(a => a.areas);
              if (allCities.some(c => c.includes("תל אביב"))) result = "win";
              else if (isExpired) result = "loss";
              break;
            }
            default: {
              // ── Dynamic bets from BuildBet (IDs contain "|") ──────────────
              if (bet.type.includes("|")) {
                const parsed = parseBetId(bet.type);
                if (parsed) {
                  const matchAlert = (areas: string[]) =>
                    alertMatchesLocation(areas, parsed.scope, parsed.location);

                  const countInLocation = () =>
                    alerts.filter(a => matchAlert(a.areas)).length;

                  switch (parsed.type) {
                    case "overunder": {
                      const count = countInLocation();
                      if (parsed.direction === "over") {
                        if (count > parsed.threshold!) result = "win";
                        else if (isExpired) result = "loss";
                      } else {
                        if (count >= parsed.threshold!) result = "loss";
                        else if (isExpired) result = "win";
                      }
                      break;
                    }
                    case "quiet": {
                      if (isExpired) {
                        const hasAlert = alerts.some(a => {
                          const t = new Date(a.time).getTime();
                          return t > betCreatedMs && t < endTime && matchAlert(a.areas);
                        });
                        result = hasAlert ? "loss" : "win";
                      }
                      break;
                    }
                    case "night": {
                      if (hour >= 0 && hour < 6) {
                        const hasNight = activeAlerts.some(a => matchAlert(a.areas));
                        if (hasNight) result = "win";
                      } else if (isExpired) {
                        result = "loss";
                      }
                      break;
                    }
                    case "total": {
                      if (isExpired) {
                        const count = countInLocation();
                        const { min, max } = parsed;
                        const inRange = count >= min! && (max === null || count <= max!);
                        result = inRange ? "win" : "loss";
                      }
                      break;
                    }
                  }
                }
              } else if (isExpired) {
                result = "loss";
              }
              break;
            }
          }

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

          if (coinsToAdd > 0) {
            await updateCoins(currentProfile.coins + coinsToAdd);
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

    resolve();
    const interval = setInterval(resolve, 30000);
    return () => clearInterval(interval);
  }, [user?.uid]); // Only re-subscribe when user changes, not on every alert update
}
