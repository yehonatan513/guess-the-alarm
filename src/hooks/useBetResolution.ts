import { useEffect, useRef } from "react";
import { ref, get, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { toast } from "sonner";

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

export function useBetResolution() {
  const { user, profile, updateCoins } = useAuth();
  const { alerts, activeAlerts, todayCount } = useAlerts();
  const processingRef = useRef(false);

  useEffect(() => {
    if (!user || !profile) return;

    const resolve = async () => {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        const snap = await get(ref(db, "bets"));
        if (!snap.exists()) { processingRef.current = false; return; }

        const bets = snap.val() as Record<string, FirebaseBet>;
        const now = new Date();
        const hour = now.getHours();
        const updates: Record<string, any> = {};
        let coinsToAdd = 0;
        let wins = 0;
        let losses = 0;

        for (const [betId, bet] of Object.entries(bets)) {
          if (bet.uid !== user.uid || bet.status !== "open") continue;

          let result: "win" | "loss" | null = null;

          switch (bet.type) {
            // "מעל 20 אזעקות היום"
            case "b2": {
              if (todayCount > 20) result = "win";
              else if (hour >= 23) result = "loss";
              break;
            }
            // "אזעקת לילה בשומרה"
            case "b1": {
              if (hour >= 0 && hour < 6) {
                const allCities = activeAlerts.flatMap(a => a.areas);
                if (allCities.some(c => c.includes("שומר"))) result = "win";
              } else if (hour >= 6) {
                // Night window passed without match
                const betDate = new Date(bet.created_at);
                const betDay = betDate.toDateString();
                const today = now.toDateString();
                if (betDay !== today || hour >= 6) result = "loss";
              }
              break;
            }
            // "אובר 10 במרכז היום"
            case "b3": {
              const centralCities = alerts.filter(a =>
                a.areas.some(c => c.includes("תל אביב") || c.includes("רמת גן") || c.includes("גבעתיים") || c.includes("בני ברק") || c.includes("חולון") || c.includes("בת ים") || c.includes("הרצליה") || c.includes("רעננה") || c.includes("כפר סבא") || c.includes("פתח תקווה") || c.includes("ראשון") || c.includes("רחובות"))
              );
              if (centralCities.length > 10) result = "win";
              else if (hour >= 23) result = "loss";
              break;
            }
            // "שקט מעל שעה"
            case "b4": {
              const betCreated = new Date(bet.created_at).getTime();
              const oneHourAfter = betCreated + 60 * 60 * 1000;
              if (now.getTime() > oneHourAfter) {
                const alertsDuringPeriod = alerts.filter(a => {
                  const t = new Date(a.time).getTime();
                  return t > betCreated && t < oneHourAfter;
                });
                result = alertsDuringPeriod.length === 0 ? "win" : "loss";
              }
              break;
            }
            // "אזעקה תוך 5 דקות"
            case "b10": {
              const betCreated = new Date(bet.created_at).getTime();
              const fiveMin = betCreated + 5 * 60 * 1000;
              if (now.getTime() > fiveMin) {
                const alertsDuring = alerts.filter(a => {
                  const t = new Date(a.time).getTime();
                  return t > betCreated && t < fiveMin;
                });
                result = alertsDuring.length > 0 ? "win" : "loss";
              }
              break;
            }
            // "שקט +30 דקות"
            case "b16": {
              const betCreated = new Date(bet.created_at).getTime();
              const thirtyMin = betCreated + 30 * 60 * 1000;
              if (now.getTime() > thirtyMin) {
                const alertsDuring = alerts.filter(a => {
                  const t = new Date(a.time).getTime();
                  return t > betCreated && t < thirtyMin;
                });
                result = alertsDuring.length === 0 ? "win" : "loss";
              }
              break;
            }
            // "אובר 50 היום"
            case "b25": {
              if (todayCount > 50) result = "win";
              else if (hour >= 23) result = "loss";
              break;
            }
            // "אובר 100 היום"
            case "b26": {
              if (todayCount > 100) result = "win";
              else if (hour >= 23) result = "loss";
              break;
            }
            // "אזעקה בת"א"
            case "b14": {
              const allCities = [...alerts, ...activeAlerts].flatMap(a => a.areas);
              const betCreated = new Date(bet.created_at);
              if (allCities.some(c => c.includes("תל אביב"))) result = "win";
              else if (hour >= 23 && betCreated.toDateString() === now.toDateString()) result = "loss";
              break;
            }
            default:
              // For unhandled bet types, check end of day
              if (hour >= 23) {
                const betCreated = new Date(bet.created_at);
                if (betCreated.toDateString() !== now.toDateString()) {
                  result = "loss";
                }
              }
              break;
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

        // Apply all updates
        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);

          if (coinsToAdd > 0) {
            await updateCoins(profile.coins + coinsToAdd);
          }

          // Update win/loss stats
          if (wins > 0 || losses > 0) {
            await update(ref(db, `users/${user.uid}`), {
              wins: (profile.wins || 0) + wins,
              losses: (profile.losses || 0) + losses,
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
  }, [user, profile, alerts, activeAlerts, todayCount]);
}
