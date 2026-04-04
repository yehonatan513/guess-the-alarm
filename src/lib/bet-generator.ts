// ── Locations ────────────────────────────────────────────────────────────────
// Comprehensive list of Israeli cities & towns relevant to alert betting.
// Sorted alphabetically in Hebrew. No duplicates.

import { CITIES, REGIONS, REGION_CITIES } from "./cities-data";
export { CITIES, REGIONS, REGION_CITIES };

// ── Types ─────────────────────────────────────────────────────────────────────

export type BetScope = "city" | "region" | "general";
export type BetType = "overunder" | "total" | "quiet" | "night";

export interface GeneratedBet {
  id: string;
  emoji: string;
  title: string;
  description: string;
  multiplier: number;
  scope: BetScope;
  type: BetType;
  location: string; // "כללי" for general scope
  riskLevel?: "נמוך" | "בינוני" | "גבוה";
  oddsExplanation?: string;
}

export const BET_TIMING = {
  DAY_START_HOUR: 6,
  DAY_END_HOUR: 23,
  NIGHT_START_HOUR: 23,
  NIGHT_END_HOUR: 6,
} as const;

// ── Type group metadata (for the 4 squares UI) ───────────────────────────────

export const BET_TYPE_GROUPS = [
  { 
    id: "overunder" as BetType, 
    emoji: "📈", 
    title: "אובר/אנדר", 
    desc: "מעל/מתחת לכמות מסוימת",
    risk: "בינוני" as const,
    explanation: "יחסים מאוזנים (בדרך כלל 1.5x-3.0x)"
  },
  { 
    id: "total" as BetType, 
    emoji: "📊", 
    title: "כמה סה\"כ", 
    desc: "כמה אזעקות יהיו סה\"כ?",
    risk: "בינוני" as const,
    explanation: "טווחים רחבים יותר מפחיתים סיכון"
  },
  { 
    id: "quiet" as BetType, 
    emoji: "🕊️", 
    title: "תקופת שקט", 
    desc: "לא תהיה אזעקה במשך זמן מה",
    risk: "גבוה" as const,
    explanation: "תלוי מאוד בפעילות העכשווית"
  },
  { 
    id: "night" as BetType, 
    emoji: "🌙", 
    title: "אזעקת לילה", 
    desc: "האם תהיה אזעקה הלילה?",
    risk: "נמוך" as const,
    explanation: "הימור לטווח ארוך (00:00-06:00)"
  },
];

// ── Multiplier tables ─────────────────────────────────────────────────────────

// Over/Under: {threshold, under-mult-city, over-mult-city, under-mult-region, over-mult-region, under-general, over-general}
const OU: Array<{ n: number; uc: number; oc: number; ur: number; or: number; ug: number; og: number }> = [
  { n: 50,   uc: 1.05, oc: 80.0,  ur: 1.1,  or: 40.0,  ug: 1.3,  og: 8.0  },
  { n: 100,  uc: 1.1,  oc: 150.0, ur: 1.3,  or: 80.0,  ug: 1.5,  og: 15.0 },
  { n: 200,  uc: 1.3,  oc: 300.0, ur: 1.6,  or: 180.0, ug: 2.0,  og: 35.0 },
  { n: 500,  uc: 1.8,  oc: 500.0, ur: 2.5,  or: 350.0, ug: 3.5,  og: 90.0 },
  { n: 1000, uc: 2.5,  oc: 500.0, ur: 4.0,  or: 500.0, ug: 1.2,  og: 8.0  },
  { n: 2000, uc: 1.05, oc: 500.0, ur: 1.05, or: 500.0, ug: 1.8,  og: 80.0 },
];

const QUIET_DURATIONS = [
  { minutes: 5,   mCity: 1.4,   mRegion: 1.3,   mGeneral: 1.2   },
  { minutes: 30,  mCity: 15.0,  mRegion: 12.0,  mGeneral: 10.0  },
  { minutes: 60,  mCity: 48.0,  mRegion: 40.0,  mGeneral: 32.0  },
  { minutes: 180, mCity: 250.0, mRegion: 200.0, mGeneral: 160.0 },
];

const TOTAL_RANGES = [
  { min: 0,    max: 50,   label: "עד 50 אזעקות",       mCity: 80.0,  mRegion: 40.0,  mGeneral: 15.0 },
  { min: 51,   max: 100,  label: "51-100 אזעקות",      mCity: 20.0,  mRegion: 12.0,  mGeneral: 8.0  },
  { min: 101,  max: 200,  label: "101-200 אזעקות",     mCity: 8.0,   mRegion: 5.0,   mGeneral: 4.0  },
  { min: 201,  max: 500,  label: "201-500 אזעקות",     mCity: 5.0,   mRegion: 4.0,   mGeneral: 3.0  },
  { min: 501,  max: 1000, label: "501-1000 אזעקות",    mCity: 15.0,  mRegion: 8.0,   mGeneral: 4.5  },
  { min: 1001, max: null, label: "מעל 1000 אזעקות",   mCity: 40.0,  mRegion: 20.0,  mGeneral: 8.0  },
];

// Allowlists for validation
const VALID_SCOPES: ReadonlySet<string> = new Set(["city", "region", "general"]);
const VALID_TYPES: ReadonlySet<string> = new Set(["overunder", "total", "quiet", "night"]);

// Multiplier bounds
const MIN_MULTIPLIER = 1.01;
const MAX_MULTIPLIER = 500.0;

function clampMultiplier(value: number): number {
  if (!Number.isFinite(value)) return MIN_MULTIPLIER;
  return Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, value));
}

// ── Generator ─────────────────────────────────────────────────────────────────

import { calculateSmartOdds } from "./odds-calculator";
import { AlertStats } from "@/hooks/useAlertStats";

export function generateBets(
  scope: BetScope, 
  type: BetType, 
  location: string, 
  stats: AlertStats | null = null, 
  todayCount: number = 0, 
  minutesLeftToday: number = 1440, 
  todayCountByCity: Record<string, number> = {}, 
  todayCountByRegion: Record<string, number> = {},
  consecutiveWins: number = 0
): GeneratedBet[] {
  // Input validation
  if (!VALID_SCOPES.has(scope) || !VALID_TYPES.has(type)) return [];
  if (typeof location !== "string" || location.length === 0 || location.length > 200) return [];

  // Streak penalty: 5% per win, max 25% (0.75x)
  const streakPenalty = Math.max(0.75, 1.0 - (Math.max(0, consecutiveWins) * 0.05));
  const loc = location === "כללי" ? "" : location;
  const locSuffix = loc ? ` ב${loc}` : "";
  const encodeId = (...parts: (string | number)[]) => parts.join("|");

  const locationTodayCount =
    scope === "general" || location === "כללי"
      ? todayCount
      : scope === "city"
      ? (todayCountByCity[location] ?? 0)
      : (todayCountByRegion[location] ?? 0);
      

  switch (type) {
    case "overunder": {
      const bets: GeneratedBet[] = [];
      for (const row of OU) {
        const underMultDefault = scope === "city" ? row.uc : scope === "region" ? row.ur : row.ug;
        const overMultDefault  = scope === "city" ? row.oc : scope === "region" ? row.or : row.og;
        
        const underMultRaw = calculateSmartOdds({
          stats, scope, location, type: "overunder", defaultMultiplier: underMultDefault, direction: "under", threshold: row.n, todayCount, minutesLeftToday, locationTodayCount, streakPenalty
        });
        const overMultRaw = calculateSmartOdds({
          stats, scope, location, type: "overunder", defaultMultiplier: overMultDefault, direction: "over", threshold: row.n, todayCount, minutesLeftToday, locationTodayCount, streakPenalty
        });

        const underMult = clampMultiplier(underMultRaw);
        const overMult = clampMultiplier(overMultRaw);

        const group = BET_TYPE_GROUPS.find(g => g.id === "overunder");

        // Check if already resolved
        const underResolved = locationTodayCount > row.n;
        const overResolved = locationTodayCount > row.n;

        bets.push({
          id: encodeId(scope, "overunder", location, "under", row.n),
          emoji: "📉",
          title: `אנדר ${row.n}${locSuffix} היום`,
          description: `פחות מ-${row.n} אזעקות${locSuffix} היום`,
          multiplier: underResolved ? -1 : underMult,
          scope, type, location,
          riskLevel: group?.risk,
          oddsExplanation: group?.explanation,
        });
        bets.push({
          id: encodeId(scope, "overunder", location, "over", row.n),
          emoji: "📈",
          title: `אובר ${row.n}${locSuffix} היום`,
          description: `מעל ${row.n} אזעקות${locSuffix} היום`,
          multiplier: overResolved ? -1 : overMult,
          scope, type, location,
          riskLevel: group?.risk,
          oddsExplanation: group?.explanation,
        });
      }
      return bets;
    }

    case "quiet": {
      return QUIET_DURATIONS.map(({ minutes, mCity, mRegion, mGeneral }) => {
        const defaultMult = scope === "city" ? mCity : scope === "region" ? mRegion : mGeneral;
        const multRaw = calculateSmartOdds({
          stats, scope, location, type: "quiet", defaultMultiplier: defaultMult, minutes, todayCount, minutesLeftToday, streakPenalty
        });
        const mult = clampMultiplier(multRaw);
        
        const group = BET_TYPE_GROUPS.find(g => g.id === "quiet");

        const durationLabel = minutes < 60
          ? `${minutes} דקות`
          : minutes === 60 ? "שעה" : `${minutes / 60} שעות`;
        return {
          id: encodeId(scope, "quiet", location, minutes),
          emoji: "🕊️",
          title: `שקט${locSuffix} ${durationLabel}`,
          description: `לא תהיה אזעקה${locSuffix} במשך ${durationLabel}`,
          multiplier: mult,
          scope, type, location,
          riskLevel: group?.risk,
          oddsExplanation: group?.explanation,
        };
      });
    }

    case "night": {
      const yesMultDefault = scope === "city" ? 4.2 : scope === "region" ? 2.8 : 1.8;
      const noMultDefault = scope === "city" ? 1.05 : scope === "region" ? 1.25 : 2.5;

      const yesMult = clampMultiplier(calculateSmartOdds({
        stats, scope, location, type: "night", defaultMultiplier: yesMultDefault, direction: "yes", todayCount, minutesLeftToday, streakPenalty
      }));
      const noMult = clampMultiplier(calculateSmartOdds({
        stats, scope, location, type: "night", defaultMultiplier: noMultDefault, direction: "no", todayCount, minutesLeftToday, streakPenalty
      }));

      const group = BET_TYPE_GROUPS.find(g => g.id === "night");

      return [
        {
          id: encodeId(scope, "night", location, "yes"),
          emoji: "🌙",
          title: `אזעקת לילה${locSuffix}`,
          description: `תהיה אזעקה${locSuffix} בין 00:00-06:00 הלילה`,
          multiplier: yesMult,
          scope, type, location,
          riskLevel: group?.risk,
          oddsExplanation: group?.explanation,
        },
        {
          id: encodeId(scope, "night", location, "no"),
          emoji: "😴",
          title: `לילה שקט${locSuffix}`,
          description: `לא תהיה אזעקה${locSuffix} בין 00:00-06:00 הלילה`,
          multiplier: noMult,
          scope, type, location,
          riskLevel: group?.risk,
          oddsExplanation: group?.explanation,
        }
      ];
    }

    case "total": {
      return TOTAL_RANGES.map(({ min, max, label, mCity, mRegion, mGeneral }) => {
        const defaultMult = scope === "city" ? mCity : scope === "region" ? mRegion : mGeneral;
        const multRaw = calculateSmartOdds({
          stats, scope, location, type: "total", defaultMultiplier: defaultMult, min, max, todayCount, minutesLeftToday, locationTodayCount, streakPenalty
        });
        const mult = clampMultiplier(multRaw);

        const group = BET_TYPE_GROUPS.find(g => g.id === "total");

        // Check if already resolved
        const effectiveMax = max !== null ? max : Infinity;
        const resolved = locationTodayCount > effectiveMax || (locationTodayCount < min && minutesLeftToday === 0);

        const desc = max === null
          ? `מעל ${min - 1} אזעקות${locSuffix} היום`
          : min === max
            ? `בדיוק ${min} אזעקות${locSuffix} היום`
            : `בין ${min} ל-${max} אזעקות${locSuffix} היום`;
        return {
          id: encodeId(scope, "total", location, min, max ?? "inf"),
          emoji: "📊",
          title: `${label}${locSuffix} היום`,
          description: desc,
          multiplier: resolved ? -1 : mult,
          scope, type, location,
          riskLevel: group?.risk,
          oddsExplanation: group?.explanation,
        };
      });
    }
  }
}

// ── Parser (used by resolution hook) ─────────────────────────────────────────

export interface ParsedBetId {
  scope: BetScope;
  type: BetType;
  location: string;
  direction?: "over" | "under" | "yes" | "no";
  threshold?: number;
  minutes?: number;
  min?: number;
  max?: number | null;
}

const VALID_SCOPES_SET: ReadonlySet<string> = new Set(["city", "region", "general"]);
const VALID_TYPES_SET: ReadonlySet<string> = new Set(["overunder", "total", "quiet", "night"]);

export function parseBetId(id: string): ParsedBetId | null {
  try {
    if (typeof id !== "string" || id.length > 500) return null;
    const parts = id.split("|");
    if (parts.length < 3) return null;

    const scope = parts[0];
    const type = parts[1];
    const location = parts[2];

    // Validate scope and type against allowlists
    if (!VALID_SCOPES_SET.has(scope)) return null;
    if (!VALID_TYPES_SET.has(type)) return null;

    // Validate location
    if (typeof location !== "string" || location.length === 0 || location.length > 200 || location.includes("|")) return null;

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
        // Only accept explicit "no"; anything else (including crafted values) defaults to "yes"
        const direction: "yes" | "no" = parts[3] === "no" ? "no" : "yes";
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
    console.error("Error parsing bet ID:", id, e);
    return null;
  }
}

export function getBetEndTime(type: BetType, betCreatedMs: number): number {
  if (type === "quiet") {
    return 6;
  }

  if (type === "night") {
    const createdDate = new Date(betCreatedMs);
    const end = new Date(createdDate);
    if (createdDate.getHours() >= 6) {
      end.setDate(end.getDate() + 1);
    }
    end.setHours(6, 0, 0, 0);
    return end.getTime();
  }

  const endOfDay = new Date(betCreatedMs);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime();
}

// Helper used by resolution: does an alert match a location?
export function alertMatchesLocation(areas: string[], scope: BetScope, location: string): boolean {
  if (scope === "general" || location === "כללי") return true;
  if (scope === "city") return areas.some(c => c.includes(location));
  if (scope === "region") {
    const cities = REGION_CITIES[location] ?? [];
    return areas.some(c => cities.some(city => c.includes(city)));
  }
  return false;
}
