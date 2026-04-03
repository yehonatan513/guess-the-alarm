import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.database();

const PROXY_URL = process.env.VITE_PROXY_URL || "https://cvokdzmibrxadrpiczow.supabase.co/functions/v1/fetch-alerts";

// Helper Interface & Functions from Frontend
interface Alert {
  id: string;
  areas: string[];
  time: string;
  type: string;
  originalTimeSec?: number;
}

type BetScope = "city" | "region" | "general";
type BetType = "overunder" | "total" | "quiet" | "night";

interface ParsedBetId {
  scope: BetScope;
  type: BetType;
  location: string;
  direction?: "over" | "under";
  threshold?: number;
  minutes?: number;
  min?: number;
  max?: number | null;
}

export const REGION_CITIES: Record<string, string[]> = {
  "עוטף עזה": [
    "שדרות", "אופקים", "ניר עם", "כרמיה", "כיסופים", "נחל עוז", "כפר עזה",
    "נתיב העשרה", "זיקים", "בארי", "רעים", "מגן", "אבשלום", "סופה",
    "ניר עוז", "ניר יצחק", "כרם שלום", "כפר מימון", "יבול", "ארז",
    "מבקיעים", "מפלסים", "עין השלושה", "סעד", "תקומה", "אור הנר",
    "עלומים", "שובה", "יתד", "שוקדה", "איבים", "דקל",
    "שדה ניצן", "יד מרדכי", "יכיני", "תלמי אליהו", "גברעם",
  ],
  "נגב מערבי": [
    "נתיבות", "אופקים", "רהט", "לקיה",
    "דורות", "אורים", "רוחמה", "שדה דוד", "גבולות",
    "מרחבים", "שדות נגב", "פטיש",
  ],
  "דרום - הנגב": [
    "באר שבע", "דימונה", "ערד", "ירוחם", "מצפה רמון",
    "מיתר", "ערערה בנגב", "כסייפה", "חורה", "תל שבע",
    "שגב שלום", "לקיה", "שדה בוקר", "אילת",
  ],
  "נגב מזרחי והערבה": [
    "ערד", "דימונה", "ירוחם", "מצפה רמון", "אילת",
    "יטבתה", "אילות", "קטורה", "לוטן", "סמר", "ספיר",
    "עין יהב", "צופר", "עידן", "חצבה", "באר אורה",
  ],
  "שפלה ומישור החוף הדרומי": [
    "אשדוד", "אשקלון", "קריית גת", "קריית מלאכי",
    "גדרה", "גן יבנה", "יבנה", "מזכרת בתיה",
    "באר יעקב", "נס ציונה", "רחובות",
    "יד מרדכי",
  ],
  "גוש דן": [
    "תל אביב", "רמת גן", "גבעתיים", "בני ברק", "חולון", "בת ים",
    "פתח תקווה", "ראשון לציון", "הרצליה",
    "גבעת שמואל", "קריית אונו", "יהוד-מונוסון", "אור יהודה",
    "ראש העין", "אלעד",
  ],
  "מרכז - תל אביב": [
    "תל אביב", "רמת גן", "גבעתיים", "בני ברק", "חולון", "בת ים",
    "ראשון לציון", "רחובות", "נס ציונה", "רמלה", "לוד",
    "פתח תקווה", "מודיעין-מכבים-רעות",
  ],
  "שרון": [
    "נתניה", "הרצליה", "רעננה", "כפר סבא", "רמת השרון", "הוד השרון",
    "כפר יונה", "קדימה-צורן", "טייבה", "טירה", "קלנסווה",
    "חדרה", "אור עקיבא", "פרדס חנה-כרכור",
    "זכרון יעקב",
  ],
  "שומרון": [
    "אריאל", "אלפי מנשה", "קרני שומרון", "ברקן",
    "עמנואל", "קדומים", "יצהר", "איתמר", "אלון מורה",
    "שבי שומרון", "רבבה", "גנים",
  ],
  "ירושלים והסביבה": [
    "ירושלים", "מבשרת ציון", "בית שמש", "מעלה אדומים",
    "גבעת זאב", "מודיעין עילית", "ביתר עילית",
  ],
  "יהודה": [
    "מעלה אדומים", "ביתר עילית", "אפרת", "בית אל",
    "קריית ארבע", "אלעזר", "טקוע", "כפר עציון",
    "נווה דניאל", "אלון שבות",
  ],
  "חיפה והקריות": [
    "חיפה", "קריית ביאליק", "קריית מוצקין", "קריית ים",
    "קריית אתא", "נשר", "טירת כרמל",
    "עוספיה (חוספיצה)", "זכרון יעקב",
  ],
  "עמק יזרעאל והעמקים": [
    "עפולה", "מגדל העמק", "יוקנעם עילית", "נצרת", "נצרת עילית (נוף הגליל)",
    "בית שאן",
  ],
  "גליל עליון וגולן": [
    "קריית שמונה", "מטולה", "צפת", "ראש פינה",
    "חצור הגלילית", "קצרין", "שלומי",
  ],
  "גליל תחתון ומערבי": [
    "נהריה", "עכו", "כרמיאל", "מעלות-תרשיחא",
    "טבריה", "סחנין",
  ],
};

function parseBetId(id: string): ParsedBetId | null {
  const parts = id.split("|");
  if (parts.length < 3) return null;
  const [scope, type, location] = parts as [BetScope, BetType, string];

  switch (type) {
    case "overunder":
      if (parts.length < 5) return null;
      return { scope, type, location, direction: parts[3] as "over" | "under", threshold: Number(parts[4]) };
    case "quiet":
      if (parts.length < 4) return null;
      return { scope, type, location, minutes: Number(parts[3]) };
    case "night":
      return { scope, type, location };
    case "total":
      if (parts.length < 5) return null;
      return { scope, type, location, min: Number(parts[3]), max: parts[4] === "inf" ? null : Number(parts[4]) };
    default:
      return null;
  }
}

function alertMatchesLocation(areas: string[], scope: BetScope, location: string): boolean {
  if (scope === "general" || location === "כללי") return true;
  if (scope === "city") return areas.some(c => c.includes(location));
  if (scope === "region") {
    const cities = REGION_CITIES[location] ?? [];
    return areas.some(c => cities.some(city => c.includes(city)));
  }
  return false;
}

export const resolveBetsJob = onSchedule("every 2 minutes", async (event) => {
  logger.info("Starting Bet Resolution Job...");
  
  try {
    // 1. Fetch live alerts from the proxy
    const res = await fetch(PROXY_URL);
    if (!res.ok) throw new Error(`HTTP fetch failed: ${res.status}`);
    const data = await res.json();
    
    const activeAlerts: Alert[] = [];
    if (data.active && Array.isArray(data.active)) {
      data.active.forEach((a: Record<string, unknown>, i: number) => {
        activeAlerts.push({
          id: `active-${Date.now()}-${i}`,
          areas: a.data ? (Array.isArray(a.data) ? a.data : a.data.split(", ")) : [a.title || "אזור לא ידוע"],
          time: new Date().toISOString(),
          type: a.cat || "missiles",
        });
      });
    }

    const allAlerts: Alert[] = [];
    let todayCount = 0;
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

    if (data.history && Array.isArray(data.history)) {
      data.history.forEach((group: Record<string, unknown>) => {
        if (group.alerts && Array.isArray(group.alerts)) {
          group.alerts.forEach((a: Record<string, unknown>, i: number) => {
            const alertTimeSec: number = a.time ?? 0;
            if (alertTimeSec >= todayMidnight) {
              todayCount++;
            }
            allAlerts.push({
              id: `hist-${group.id || 0}-${i}`,
              areas: Array.isArray(a.cities) ? a.cities : [a.cities || "אזור לא ידוע"],
              time: alertTimeSec ? new Date(alertTimeSec * 1000).toISOString() : new Date().toISOString(),
              type: a.threat === 0 ? "missiles" : String(a.threat),
              originalTimeSec: alertTimeSec, // Keep track for stats builder
            });
          });
        }
      });
    }

    // ── SMART ODDS: DATA INGESTION ──
    const statsSnap = await db.ref("alert_stats/last_processed_time").once("value");
    const lastProcessedTime = statsSnap.val() || 0;
    
    let maxTimeSeen = lastProcessedTime;
    const newStatsUpdates: Record<string, number> = {};
    let totalNewAlerts = 0;

    // We check all historical alerts to see if any are newer than what we processed last time
    // We only process 'allAlerts' because 'activeAlerts' are live and will eventually be in history too, 
    // but to avoid missed live alerts, we might want to just count history since it's an archive of the day.
    allAlerts.forEach((alert: Record<string, unknown>) => {
      if (alert.originalTimeSec > lastProcessedTime) {
        if (alert.originalTimeSec > maxTimeSeen) {
          maxTimeSeen = alert.originalTimeSec;
        }
        totalNewAlerts++;
        
        // Count cities
        alert.areas.forEach((city: string) => {
          const sanitizedCity = city.replace(/[.#$[\]]/g, "_"); // Firebase key safe
          newStatsUpdates[`cities/${sanitizedCity}`] = (newStatsUpdates[`cities/${sanitizedCity}`] || 0) + 1;
          
          // Count Region if we can find it
          let foundRegion = "אחר";
          for (const [regionName, citiesArr] of Object.entries(REGION_CITIES)) {
            if (citiesArr.some(c => city.includes(c))) {
              foundRegion = regionName;
              break;
            }
          }
          const sanitizedRegion = foundRegion.replace(/[.#$[\]]/g, "_");
          newStatsUpdates[`regions/${sanitizedRegion}`] = (newStatsUpdates[`regions/${sanitizedRegion}`] || 0) + 1;
        });
      }
    });

    if (totalNewAlerts > 0) {
      try {
        await db.ref("alert_stats").transaction((currentData) => {
          if (!currentData) currentData = {};
          if (!currentData.tracking_started_at) {
            currentData.tracking_started_at = admin.database.ServerValue.TIMESTAMP;
          }
          currentData.total_alerts = (currentData.total_alerts || 0) + totalNewAlerts;
          currentData.last_processed_time = maxTimeSeen;
          
          if (!currentData.cities) currentData.cities = {};
          if (!currentData.regions) currentData.regions = {};
          
          Object.entries(newStatsUpdates).forEach(([path, increment]) => {
            if (path.startsWith("cities/")) {
              const key = path.replace("cities/", "");
              currentData.cities[key] = (currentData.cities[key] || 0) + increment;
            } else if (path.startsWith("regions/")) {
              const key = path.replace("regions/", "");
              currentData.regions[key] = (currentData.regions[key] || 0) + increment;
            }
          });
          
          return currentData;
        });
        logger.info(`Ingested ${totalNewAlerts} new alerts into smart odds stats.`);
      } catch (e) {
        logger.error("Failed to update alert stats transaction", e);
      }
    }
    // ────────────────────────────────

    // 2. Load open bets
    const snapshot = await db.ref("bets").orderByChild("status").equalTo("open").once("value");
    if (!snapshot.exists()) {
      logger.info("No open bets found. Ending job.");
      return;
    }
    
    const bets = snapshot.val() as Record<string, Record<string, unknown>>;
    const hour = now.getHours();
    
    // Track updates
    const updates: Record<string, unknown> = {};
    const userWins: Record<string, { coins: number; wins: number }> = {};
    const userLosses: Record<string, number> = {};

    for (const [betId, bet] of Object.entries(bets)) {
      let result: "win" | "loss" | null = null;
      const tId = bet.type;

      // Handle custom/static IDs
      switch (tId) {
        case "b2":
          if (todayCount > 20) result = "win";
          else if (hour >= 23) result = "loss";
          break;
        case "b1":
          if (hour >= 0 && hour < 6) {
            const allCities = activeAlerts.flatMap(a => a.areas);
            if (allCities.some(c => c.includes("שומר"))) result = "win";
          } else if (hour >= 6) {
            const betDate = new Date(bet.created_at);
            if (betDate.toDateString() === now.toDateString()) result = "loss";
          }
          break;
        case "b3": {
          const centralCities = allAlerts.filter(a =>
            a.areas.some(c =>
              c.includes("תל אביב") || c.includes("רמת גן") || c.includes("גבעתיים") ||
              c.includes("בני ברק") || c.includes("חולון") || c.includes("בת ים") ||
              c.includes("הרצליה") || c.includes("רעננה") || c.includes("כפר סבא") ||
              c.includes("פתח תקווה") || c.includes("ראשון") || c.includes("רחובות")
            )
          );
          if (centralCities.length > 10) result = "win";
          else if (hour >= 23) result = "loss";
          break;
        }
        case "b4":
        case "b10":
        case "b16": { // Time based
          const delay = tId === "b4" ? 60 : tId === "b10" ? 5 : 30;
          const betCreated = new Date(bet.created_at).getTime();
          const thresholdTime = betCreated + delay * 60 * 1000;
          if (now.getTime() > thresholdTime) {
            const alertsDuring = allAlerts.filter(a => {
              const t = new Date(a.time).getTime();
              return t > betCreated && t < thresholdTime;
            });
            if (tId === "b10") {
              result = alertsDuring.length > 0 ? "win" : "loss"; // Needs an alert
            } else {
              result = alertsDuring.length === 0 ? "win" : "loss"; // Needs quiet
            }
          }
          break;
        }
        case "b25":
          if (todayCount > 50) result = "win";
          else if (hour >= 23) result = "loss";
          break;
        case "b26":
          if (todayCount > 100) result = "win";
          else if (hour >= 23) result = "loss";
          break;
      }

      // Handle Dynamic Generated Bets
      if (tId && tId.includes("|")) {
        const parsed = parseBetId(tId);
        if (parsed) {
          const matchAlert = (areas: string[]) => alertMatchesLocation(areas, parsed.scope, parsed.location);
          const countInLocation = () => allAlerts.filter(a => matchAlert(a.areas)).length;

          switch (parsed.type) {
            case "overunder": {
              const count = countInLocation();
              if (parsed.direction === "over") {
                if (count > parsed.threshold!) result = "win";
                else if (hour >= 23) result = "loss";
              } else {
                if (count >= parsed.threshold!) result = "loss";
                else if (hour >= 23) result = "win";
              }
              break;
            }
            case "quiet": {
              const betCreated = new Date(bet.created_at).getTime();
              const endTime = betCreated + (parsed.minutes! * 60 * 1000);
              if (now.getTime() > endTime) {
                const hasAlert = allAlerts.some(a => {
                  const t = new Date(a.time).getTime();
                  return t > betCreated && t < endTime && matchAlert(a.areas);
                });
                result = hasAlert ? "loss" : "win";
              }
              break;
            }
            case "night": {
              if (hour >= 0 && hour < 6) {
                const hasNight = activeAlerts.some(a => matchAlert(a.areas));
                if (hasNight) result = "win";
              } else if (hour >= 6) {
                const betDate = new Date(bet.created_at);
                if (betDate.toDateString() === now.toDateString()) result = "loss";
              }
              break;
            }
            case "total": {
              if (hour >= 23) {
                const count = countInLocation();
                const { min, max } = parsed;
                const inRange = count >= min! && (max === null || count <= max!);
                result = inRange ? "win" : "loss";
              }
              break;
            }
          }
        }
      } else if (!result && hour >= 23) {
        // Fallback catch-all for unknown static bets at end of day
        const betCreated = new Date(bet.created_at);
        if (betCreated.toDateString() !== now.toDateString()) {
          result = "loss";
        }
      }

      if (result) {
        const winnings = result === "win" ? Math.floor((bet.amount || 0) * (bet.multiplier || 1)) : 0;
        updates[`bets/${betId}/status`] = result === "win" ? "won" : "lost";
        updates[`bets/${betId}/resolved_at`] = now.toISOString();
        updates[`bets/${betId}/coins_won`] = winnings;

        // Tally user stats
        if (result === "win") {
          if (!userWins[bet.uid]) userWins[bet.uid] = { coins: 0, wins: 0 };
          userWins[bet.uid].coins += winnings;
          userWins[bet.uid].wins++;
        } else {
          if (!userLosses[bet.uid]) userLosses[bet.uid] = 0;
          userLosses[bet.uid]++;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      // Perform atomic update for bets
      await db.ref().update(updates);
      logger.info(`Resolved ${Object.keys(updates).length} bets.`);

      // Update Individual Users Coins safely using transaction
      for (const [uid, w] of Object.entries(userWins)) {
        await db.ref(`users/${uid}/coins`).transaction((coins: number | null) => {
          return (coins || 0) + w.coins;
        });
        await db.ref(`users/${uid}/wins`).transaction((wins: number | null) => {
          return (wins || 0) + w.wins;
        });
        
        // Also fire an update to Leaderboard so it syncs
        const userSnap = await db.ref(`users/${uid}`).once('value');
        if (userSnap.exists()) {
          db.ref(`leaderboard/${uid}`).update({
            coins: userSnap.val().coins,
            username: userSnap.val().username,
            avatar_emoji: userSnap.val().avatar_emoji
          });
        }
      }

      // Record losses
      for (const [uid, lossCount] of Object.entries(userLosses)) {
        await db.ref(`users/${uid}/losses`).transaction((losses: number | null) => {
          return (losses || 0) + lossCount;
        });
      }
    } else {
       logger.info("Reviewed bets, but nothing resolved in this tick.");
    }
  } catch (err) {
    logger.error("Job Error:", err);
  }
});
