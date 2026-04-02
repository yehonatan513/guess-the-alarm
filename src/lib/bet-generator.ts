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
}

// ── Type group metadata (for the 4 squares UI) ───────────────────────────────

export const BET_TYPE_GROUPS = [
  { id: "overunder" as BetType, emoji: "📈", title: "אובר/אנדר", desc: "מעל/מתחת לכמות מסוימת" },
  { id: "total"     as BetType, emoji: "📊", title: "כמה סה\"כ",  desc: "כמה אזעקות יהיו סה\"כ?" },
  { id: "quiet"     as BetType, emoji: "🕊️", title: "תקופת שקט",  desc: "כמה זמן עד האזעקה הבאה?" },
  { id: "night"     as BetType, emoji: "🌙", title: "אזעקת לילה", desc: "האם תהיה אזעקה הלילה?" },
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
  { min: 0,  max: 0,    label: "0 אזעקות",       mCity: 150.0, mRegion: 60.0, mGeneral: 25.0 },
  { min: 1,  max: 3,    label: "1-3 אזעקות",     mCity: 5.0,   mRegion: 8.5,  mGeneral: 12.0 },
  { min: 4,  max: 10,   label: "4-10 אזעקות",    mCity: 4.0,   mRegion: 4.5,  mGeneral: 6.0  },
  { min: 11, max: 20,   label: "11-20 אזעקות",   mCity: 8.0,   mRegion: 5.5,  mGeneral: 4.5  },
  { min: 21, max: 50,   label: "21-50 אזעקות",   mCity: 20.0,  mRegion: 10.0, mGeneral: 8.0  },
  { min: 51, max: null, label: "מעל 50 אזעקות",  mCity: 85.0,  mRegion: 35.0, mGeneral: 20.0 },
];

// ── Generator ─────────────────────────────────────────────────────────────────

import { calculateSmartOdds } from "./odds-calculator";
import { AlertStats } from "@/hooks/useAlertStats";

export function generateBets(scope: BetScope, type: BetType, location: string, stats: AlertStats | null = null, todayCount: number = 0, minutesLeftToday: number = 1440, todayCountByCity: Record<string, number> = {}, todayCountByRegion: Record<string, number> = {}): GeneratedBet[] {
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
        
        const underMult = calculateSmartOdds({
          stats, scope, location, type: "overunder", defaultMultiplier: underMultDefault, direction: "under", threshold: row.n, todayCount, minutesLeftToday, locationTodayCount
        });
        const overMult = calculateSmartOdds({
          stats, scope, location, type: "overunder", defaultMultiplier: overMultDefault, direction: "over", threshold: row.n, todayCount, minutesLeftToday, locationTodayCount
        });

        // Check if already resolved
        const underResolved = locationTodayCount >= row.n;
        const overResolved = locationTodayCount > row.n;

        bets.push({
          id: encodeId(scope, "overunder", location, "under", row.n),
          emoji: "📉",
          title: `אנדר ${row.n}${locSuffix} היום`,
          description: `פחות מ-${row.n} אזעקות${locSuffix} היום`,
          multiplier: underResolved ? -1 : underMult,
          scope, type, location,
        });
        bets.push({
          id: encodeId(scope, "overunder", location, "over", row.n),
          emoji: "📈",
          title: `אובר ${row.n}${locSuffix} היום`,
          description: `מעל ${row.n} אזעקות${locSuffix} היום`,
          multiplier: overResolved ? -1 : overMult,
          scope, type, location,
        });
      }
      return bets;
    }

    case "quiet": {
      return QUIET_DURATIONS.map(({ minutes, mCity, mRegion, mGeneral }) => {
        const defaultMult = scope === "city" ? mCity : scope === "region" ? mRegion : mGeneral;
        const mult = calculateSmartOdds({
          stats, scope, location, type: "quiet", defaultMultiplier: defaultMult, minutes, todayCount, minutesLeftToday
        });

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
        };
      });
    }

    case "night": {
      const yesMultDefault = scope === "city" ? 4.2 : scope === "region" ? 2.8 : 1.8;
      const noMultDefault = scope === "city" ? 1.05 : scope === "region" ? 1.25 : 2.5;

      const yesMult = calculateSmartOdds({
        stats, scope, location, type: "night", defaultMultiplier: yesMultDefault, direction: "yes", todayCount, minutesLeftToday
      });
      const noMult = calculateSmartOdds({
        stats, scope, location, type: "night", defaultMultiplier: noMultDefault, direction: "no", todayCount, minutesLeftToday
      });

      return [
        {
          id: encodeId(scope, "night", location, "yes"),
          emoji: "🌙",
          title: `אזעקת לילה${locSuffix}`,
          description: `תהיה אזעקה${locSuffix} בין 00:00-06:00 הלילה`,
          multiplier: yesMult,
          scope, type, location,
        },
        {
          id: encodeId(scope, "night", location, "no"),
          emoji: "😴",
          title: `לילה שקט${locSuffix}`,
          description: `לא תהיה אזעקה${locSuffix} בין 00:00-06:00 הלילה`,
          multiplier: noMult,
          scope, type, location,
        }
      ];
    }

    case "total": {
      return TOTAL_RANGES.map(({ min, max, label, mCity, mRegion, mGeneral }) => {
        const defaultMult = scope === "city" ? mCity : scope === "region" ? mRegion : mGeneral;
        const mult = calculateSmartOdds({
          stats, scope, location, type: "total", defaultMultiplier: defaultMult, min, max, todayCount, minutesLeftToday, locationTodayCount
        });

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

export function parseBetId(id: string): ParsedBetId | null {
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
      return { scope, type, location, direction: (parts[3] === "no" ? "no" : "yes") };
    case "total":
      if (parts.length < 5) return null;
      return { scope, type, location, min: Number(parts[3]), max: parts[4] === "inf" ? null : Number(parts[4]) };
    default:
      return null;
  }
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

// ── Shared Expiry Logic ──────────────────────────────────────────────────────

function getEndOfDay(baseMs: number): number {
  const d = new Date(baseMs);
  d.setHours(23, 0, 0, 0);
  return d.getTime();
}

function getNextMorning(baseMs: number): number {
  const d = new Date(baseMs);
  if (d.getHours() >= 6) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(6, 0, 0, 0);
  return d.getTime();
}

export function getBetEndTime(betId: string, createdAtMs: number): number {
  if (betId.includes("|")) {
    const parsed = parseBetId(betId);
    if (!parsed) return getEndOfDay(createdAtMs);

    switch (parsed.type) {
      case "night": return getNextMorning(createdAtMs);
      case "quiet": return createdAtMs + (parsed.minutes! * 60 * 1000);
      case "overunder":
      case "total":
      default:
        return getEndOfDay(createdAtMs);
    }
  }

  // Static bets
  switch (betId) {
    case "b1": return getNextMorning(createdAtMs);
    case "b4": return createdAtMs + (60 * 60 * 1000);
    case "b10": return createdAtMs + (5 * 60 * 1000);
    case "b16": return createdAtMs + (30 * 60 * 1000);
    // b2, b3, b14, b25, b26 expire at end of day
    default: return getEndOfDay(createdAtMs);
  }
}
