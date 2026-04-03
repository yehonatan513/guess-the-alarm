import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.database();

// SSRF fix: only allow the configured proxy URL, validated against an allowlist
const ALLOWED_PROXY_URLS = [
  "https://cvokdzmibrxadrpiczow.supabase.co/functions/v1/fetch-alerts",
];
const RAW_PROXY_URL = process.env.VITE_PROXY_URL || "https://cvokdzmibrxadrpiczow.supabase.co/functions/v1/fetch-alerts";
const PROXY_URL = ALLOWED_PROXY_URLS.includes(RAW_PROXY_URL)
  ? RAW_PROXY_URL
  : ALLOWED_PROXY_URLS[0];

// Limits to prevent integer overflow / manipulation
const MAX_BET_AMOUNT = 1_000_000;
const MAX_MULTIPLIER = 1_000;
const MAX_COINS_WON = 1_000_000_000;

// Helper Interface & Functions from Frontend
interface Alert {
  id: string;
  areas: string[];
  time: string;
  type: string;
  originalTimeSec?: number;
}

interface RawAlert {
  data?: unknown;
  title?: unknown;
  cat?: unknown;
  time?: unknown;
  cities?: unknown;
  threat?: unknown;
}

interface HistoryGroup {
  id?: unknown;
  alerts?: unknown;
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

type BetScope = "city" | "region" | "general";
type BetType = "overunder" | "total" | "quiet" | "night";

interface ParsedBetId {
  scope: BetScope;
  type: BetType;
  location: string;
  direction?: "over" | "under" | "yes" | "no";
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

const VALID_SCOPES: ReadonlySet<string> = new Set(["city", "region", "general"]);
const VALID_TYPES: ReadonlySet<string> = new Set(["overunder", "total", "quiet", "night"]);
const VALID_DIRECTIONS: ReadonlySet<string> = new Set(["over", "under", "yes", "no"]);

// Sanitize a string for use as a Firebase Realtime Database key
function sanitizeFirebaseKey(key: string): string {
  return key.replace(/[.#$[\]]/g, "_").slice(0, 768);
}

// Validate that a string is a safe, non-empty location name (no pipe chars, reasonable length)
function isValidLocation(loc: string): boolean {
  return typeof loc === "string" && loc.length > 0 && loc.length <= 200 && !loc.includes("|");
}

function parseBetId(id: string): ParsedBetId | null {
  try {
    if (typeof id !== "string" || id.length > 500) return null;
    const parts = id.split("|");
    if (parts.length < 3) return null;

    const scope = parts[0];
    const type = parts[1];
    const location = parts[2];

    // Validate scope and type against allowlists
    if (!VALID_SCOPES.has(scope)) return null;
    if (!VALID_TYPES.has(type)) return null;
    if (!isValidLocation(location)) return null;

    const validScope = scope as BetScope;
    const validType = type as BetType;

    switch (validType) {
      case "overunder": {
        if (parts.length < 5) return null;
        const direction = parts[3];
        if (direction !== "over" && direction !== "under") return null;
        const threshold = Number(parts[4]);
        if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1_000_000) return null;
        return { scope: validScope, type: validType, location, direction, threshold };
      }
      case "quiet": {
        if (parts.length < 4) return null;
        const minutes = Number(parts[3]);
        if (!Number.isFinite(minutes) || minutes < 0 || minutes > 10_000) return null;
        return { scope: validScope, type: validType, location, minutes };
      }
      case "night": {
        const direction = parts[3] === "no" ? "no" : "yes";
        return { scope: validScope, type: validType, location, direction };
      }
      case "total": {
        if (parts.length < 5) return null;
        const min = Number(parts[3]);
        const maxVal = parts[4] === "inf" ? null : Number(parts[4]);
        if (!Number.isFinite(min) || min < 0 || min > 1_000_000) return null;
        if (maxVal !== null && (!Number.isFinite(maxVal) || maxVal < 0 || maxVal > 1_000_000)) return null;
        return { scope: validScope, type: validType, location, min, max: maxVal };
      }
      default:
        return null;
    }
  } catch (e) {
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

// Safely extract a string from an unknown value
function safeString(val: unknown, fallback: string): string {
  return typeof val === "string" ? val : fallback;
}

// Safely extract a number from an unknown value
function safeNumber(val: unknown, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

// Validate and coerce a FirebaseBet from raw snapshot data
function validateFirebaseBet(raw: unknown): FirebaseBet | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const uid = safeString(r.uid, "");
  const username = safeString(r.username, "");
  const type = safeString(r.type, "");
  const description = safeString(r.description, "");
  const status = safeString(r.status, "");
  const created_at = safeString(r.created_at, "");
  const resolved_at = r.resolved_at === null ? null : safeString(r.resolved_at, "");
  const coins_won = safeNumber(r.coins_won, 0);

  // Clamp amount and multiplier to prevent overflow/manipulation
  const rawAmount = safeNumber(r.amount, 0);
  const rawMultiplier = safeNumber(r.multiplier, 1);
  const amount = Math.max(0, Math.min(MAX_BET_AMOUNT, Math.floor(rawAmount)));
  const multiplier = Math.max(1, Math.min(MAX_MULTIPLIER, rawMultiplier));

  if (!uid || !type || !status) return null;

  return { uid, username, type, description, amount, multiplier, status, created_at, resolved_at, coins_won };
}

export const resolveBetsJob = onSchedule("every 2 minutes", async (event) => {
  logger.info("Starting Bet Resolution Job...");
  
  try {
    // 1. Fetch live alerts from the proxy
    const res = await fetch(PROXY_URL);
    if (!res.ok) throw new Error(`HTTP fetch failed: ${res.status}`);

    // Safe deserialization: parse and validate structure before use
    let data: Record<string, unknown>;
    try {
      const raw = await res.json();
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("Unexpected API response shape");
      }
      data = raw as Record<string, unknown>;
    } catch (e) {
      throw new Error(`Failed to parse API response: ${e}`);
    }
    
    const activeAlerts: Alert[] = [];
    if (data.active && Array.isArray(data.active)) {
      (data.active as unknown[]).forEach((a: unknown, i: number) => {
        if (!a || typeof a !== "object") return;
        const ra = a as RawAlert;
        const dataField = ra.data;
        let areas: string[];
        if (typeof dataField === "string") {
          areas = dataField.split(", ").filter(s => typeof s === "string");
        } else if (Array.isArray(dataField)) {
          areas = (dataField as unknown[]).filter(s => typeof s === "string") as string[];
        } else {
          areas = [typeof ra.title === "string" ? ra.title : "אזור לא ידוע"];
        }
        activeAlerts.push({
          id: `active-${Date.now()}-${i}`,
          areas,
          time: new Date().toISOString(),
          type: typeof ra.cat === "string" ? ra.cat : "missiles",
        });
      });
    }

    const allAlerts: Alert[] = [];
    let todayCount = 0;
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

    if (data.history && Array.isArray(data.history)) {
      (data.history as unknown[]).forEach((group: unknown) => {
        if (!group || typeof group !== "object") return;
        const g = group as HistoryGroup;
        if (!Array.isArray(g.alerts)) return;
        (g.alerts as unknown[]).forEach((a: unknown, i: number) => {
          if (!a || typeof a !== "object") return;
          const ra = a as RawAlert;
          const alertTimeSec: number = typeof ra.time === "number" ? ra.time : 0;
          if (alertTimeSec >= todayMidnight) {
            todayCount++;
          }
          let cities: string[];
          if (Array.isArray(ra.cities)) {
            cities = (ra.cities as unknown[]).filter(s => typeof s === "string") as string[];
          } else if (typeof ra.cities === "string") {
            cities = [ra.cities];
          } else {
            cities = ["אזור לא ידוע"];
          }
          const groupId = typeof g.id === "string" || typeof g.id === "number" ? g.id : 0;
          allAlerts.push({
            id: `hist-${groupId}-${i}`,
            areas: cities,
            time: alertTimeSec ? new Date(alertTimeSec * 1000).toISOString() : new Date().toISOString(),
            type: ra.threat === 0 ? "missiles" : String(ra.threat ?? "unknown"),
            originalTimeSec: alertTimeSec,
          });
        });
      });
    }

    // ── SMART ODDS: DATA INGESTION ──
    const statsSnap = await db.ref("alert_stats/last_processed_time").once("value");
    const lastProcessedTime = typeof statsSnap.val() === "number" ? statsSnap.val() : 0;
    
    let maxTimeSeen = lastProcessedTime;
    const newStatsUpdates: Record<string, number> = Object.create(null);
    let totalNewAlerts = 0;

    allAlerts.forEach((alert: Alert) => {
      const time = alert.originalTimeSec ?? 0;
      if (time > lastProcessedTime) {
        if (time > maxTimeSeen) {
          maxTimeSeen = time;
        }
        totalNewAlerts++;
        
        (alert.areas as string[]).forEach((city: string) => {
          if (typeof city !== "string" || city.length === 0) return;
          const sanitizedCity = sanitizeFirebaseKey(city);
          // Prevent prototype pollution by checking key safety
          if (sanitizedCity === "__proto__" || sanitizedCity === "constructor" || sanitizedCity === "prototype") return;
          const cityKey = `cities/${sanitizedCity}`;
          newStatsUpdates[cityKey] = (newStatsUpdates[cityKey] || 0) + 1;
          
          let foundRegion = "אחר";
          for (const [regionName, citiesArr] of Object.entries(REGION_CITIES)) {
            if (citiesArr.some(c => city.includes(c))) {
              foundRegion = regionName;
              break;
            }
          }
          const sanitizedRegion = sanitizeFirebaseKey(foundRegion);
          if (sanitizedRegion === "__proto__" || sanitizedRegion === "constructor" || sanitizedRegion === "prototype") return;
          const regionKey = `regions/${sanitizedRegion}`;
          newStatsUpdates[regionKey] = (newStatsUpdates[regionKey] || 0) + 1;
        });
      }
    });

    if (totalNewAlerts > 0) {
      try {
        await db.ref("alert_stats").transaction((currentData) => {
          // Prototype pollution fix: ensure we work with a plain object
          if (!currentData || typeof currentData !== "object") currentData = Object.create(null);
          if (!currentData.tracking_started_at) {
            currentData.tracking_started_at = admin.database.ServerValue.TIMESTAMP;
          }
          currentData.total_alerts = (currentData.total_alerts || 0) + totalNewAlerts;
          currentData.last_processed_time = maxTimeSeen;
          
          if (!currentData.cities || typeof currentData.cities !== "object") currentData.cities = Object.create(null);
          if (!currentData.regions || typeof currentData.regions !== "object") currentData.regions = Object.create(null);
          
          for (const [path, increment] of Object.entries(newStatsUpdates)) {
            if (path.startsWith("cities/")) {
              const key = path.slice("cities/".length);
              if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
              currentData.cities[key] = (currentData.cities[key] || 0) + increment;
            } else if (path.startsWith("regions/")) {
              const key = path.slice("regions/".length);
              if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
              currentData.regions[key] = (currentData.regions[key] || 0) + increment;
            }
          }
          
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
    
    // Safe cast: validate each bet entry
    const rawBetsData = snapshot.val();
    if (!rawBetsData || typeof rawBetsData !== "object") {
      logger.info("Bets data is not an object. Ending job.");
      return;
    }
    const hour = now.getHours();
    
    // Track updates
    const updates: Record<string, string | number | null> = {};
    const userWins: Record<string, { coins: number; wins: number }> = {};
    const userLosses: Record<string, number> = {};

    for (const [betId, rawBet] of Object.entries(rawBetsData as Record<string, unknown>)) {
      // Validate betId: must be a non-empty string with no path traversal chars
      if (typeof betId !== "string" || betId.length === 0 || betId.includes("/") || betId.includes("..")) {
        logger.warn(`Skipping bet with invalid ID: ${betId}`);
        continue;
      }

      const bet = validateFirebaseBet(rawBet);
      if (!bet) {
        logger.warn(`Skipping bet with invalid data for ID: ${betId}`);
        continue;
      }

      let result: "win" | "loss" | null = null;
      const tId = bet.type;

      // Validate tId before using in parseBetId
      if (typeof tId !== "string" || tId.length > 500) {
        logger.warn(`Skipping bet with invalid type for ID: ${betId}`);
        continue;
      }

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
              c.includes("הרצליה") || c.includes("רעננה") || c.includes("כפר סבא")
            )
          );
          if (centralCities.length > 0) result = "win";
          else if (hour >= 23) result = "loss";
          break;
        }
        default: {
          // Dynamic bet ID: parse and validate
          const parsed = parseBetId(tId);
          if (!parsed) {
            logger.warn(`Could not parse bet ID: ${tId}`);
            break;
          }
          // Resolution logic based on parsed bet type would go here
          break;
        }
      }

      if (result) {
        // Validate UID before using as a Firebase key
        const uid = bet.uid;
        if (typeof uid !== "string" || uid.length === 0 || uid.includes("/") || uid.includes(".") || uid.includes("#") || uid.includes("$") || uid.includes("[") || uid.includes("]")) {
          logger.warn(`Skipping bet with invalid UID: ${uid}`);
          continue;
        }

        const sanitizedBetId = sanitizeFirebaseKey(betId);

        if (result === "win") {
          // Integer overflow fix: clamp winnings
          const coinsWon = Math.min(
            MAX_COINS_WON,
            Math.floor(bet.amount * bet.multiplier)
          );
          updates[`bets/${sanitizedBetId}/status`] = "won";
          updates[`bets/${sanitizedBetId}/resolved_at`] = new Date().toISOString();
          updates[`bets/${sanitizedBetId}/coins_won`] = coinsWon;
          if (!userWins[uid]) userWins[uid] = { coins: 0, wins: 0 };
          userWins[uid].coins += coinsWon;
          userWins[uid].wins += 1;
        } else {
          updates[`bets/${sanitizedBetId}/status`] = "lost";
          updates[`bets/${sanitizedBetId}/resolved_at`] = new Date().toISOString();
          updates[`bets/${sanitizedBetId}/coins_won`] = 0;
          userLosses[uid] = (userLosses[uid] || 0) + 1;
        }
      }
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
      logger.info(`Applied ${Object.keys(updates).length} bet resolution updates.`);
    }

    // Update user stats
    for (const [uid, { coins, wins }] of Object.entries(userWins)) {
      if (typeof uid !== "string" || uid.length === 0) continue;
      await db.ref(`users/${uid}`).transaction((userData) => {
        if (!userData || typeof userData !== "object") userData = Object.create(null);
        userData.coins = (userData.coins || 0) + coins;
        userData.wins = (userData.wins || 0) + wins;
        return userData;
      });
    }

    for (const [uid, losses] of Object.entries(userLosses)) {
      if (typeof uid !== "string" || uid.length === 0) continue;
      await db.ref(`users/${uid}`).transaction((userData) => {
        if (!userData || typeof userData !== "object") userData = Object.create(null);
        userData.losses = (userData.losses || 0) + losses;
        return userData;
      });
    }

    logger.info("Bet Resolution Job completed.");
  } catch (e) {
    logger.error("Bet Resolution Job failed", e);
  }
});
