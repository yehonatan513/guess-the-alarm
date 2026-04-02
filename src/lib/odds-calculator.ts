import { AlertStats } from "@/hooks/useAlertStats";

function poissonCDF(lambda: number, k: number): number {
  if (k < 0) return 0;
  if (lambda <= 0) return 1;
  let p = Math.exp(-lambda);
  let sum = p;
  for (let i = 1; i <= k; i++) {
    p = p * (lambda / i);
    sum += p;
  }
  return Math.min(1, sum);
}

// Maps probability to multiplier within [minMult, maxMult].
const HOUSE_EDGE = 0.05; // 5%

function probToRange(prob: number, minMult: number, maxMult: number, streakPenalty: number = 1.0): number {
  const p = Math.max(0.00001, Math.min(0.99999, prob));
  // score: 0 = certain (prob near 1), 1 = impossible (prob near 0)
  const score = Math.log(1 / p) / Math.log(1 / 0.00001);
  const clamped = Math.max(0, Math.min(1, score));
  const result = Math.exp(
    Math.log(minMult) + clamped * (Math.log(maxMult) - Math.log(minMult))
  );
  
  // Apply house edge and streak penalty
  const final = result * (1 - HOUSE_EDGE) * streakPenalty;
  
  return parseFloat(Math.max(minMult, Math.min(maxMult, final)).toFixed(2));
}

export interface SmartOddsParams {
  stats: AlertStats | null;
  scope: "city" | "region" | "general";
  location: string;
  type: "quiet" | "night" | "overunder" | "total";
  defaultMultiplier: number;
  todayCount?: number;
  minutesLeftToday?: number;
  minutes?: number;
  threshold?: number;
  direction?: "over" | "under" | "yes" | "no";
  min?: number;
  max?: number | null;
  // Location-specific today counts (passed from bet-generator)
  locationTodayCount?: number;
  streakPenalty?: number;
}

const MIN_ALERTS_FOR_SMART_ODDS = 30; // lowered: we have per-location counts now

export function calculateSmartOdds(params: SmartOddsParams): number {
  const {
    stats, scope, location, type, defaultMultiplier,
    todayCount = 0,
    minutesLeftToday = 1440,
    locationTodayCount,
    streakPenalty = 1.0,
  } = params;

  // Use location-specific count if provided, otherwise fall back to global
  const localCount = locationTodayCount ?? todayCount;

  if (!stats || !stats.tracking_started_at) {
    return defaultMultiplier;
  }

  const now = Date.now();
  const trackingStartMs = stats.tracking_started_at > 1e12
    ? stats.tracking_started_at
    : stats.tracking_started_at * 1000;
  const daysTracked = Math.max(1, (now - trackingStartMs) / 86400000);
  const sanitizedLocation = location.replace(/[.#$[\]]/g, "_");

  let count = 0;
  if (scope === "general" || location === "כללי") {
    count = stats.total_alerts;
  } else if (scope === "city") {
    count = stats.cities?.[sanitizedLocation] || 0;
  } else if (scope === "region") {
    count = stats.regions?.[sanitizedLocation] || 0;
  }

  // If location has too little data — use default
  if (count < 5) return defaultMultiplier;

  const historicalDailyRate = count / daysTracked;
  const fractionLeft = Math.max(0.001, minutesLeftToday) / 1440;
  const lambdaRemaining = historicalDailyRate * fractionLeft;

  // Probability scaling factor based on scope
  const scopeScale = scope === "general" ? 1.0 : scope === "region" ? 0.85 : 0.7;

  switch (type) {

    case "overunder": {
      const threshold = params.threshold ?? 0;
      const remainingNeeded = threshold - localCount;

      if (params.direction === "under") {
        if (remainingNeeded < 0) return 1.01;
        const prob = poissonCDF(lambdaRemaining, remainingNeeded);
        return probToRange(prob, 1.01, 25.0 * scopeScale, streakPenalty);

      } else { // "over"
        if (remainingNeeded <= 0) return 1.01;
        const prob = 1 - poissonCDF(lambdaRemaining, remainingNeeded - 1);
        return probToRange(prob, 1.05, 500.0 * scopeScale, streakPenalty);
      }
    }

    case "total": {
      const min = params.min ?? 0;
      const max = params.max !== undefined && params.max !== null ? params.max : 1000;
      const remainingForMax = max - localCount;
      const remainingForMin = min - localCount;
      const pMax = poissonCDF(lambdaRemaining, Math.max(0, remainingForMax));
      const pMin = poissonCDF(lambdaRemaining, Math.max(-1, remainingForMin - 1));
      const prob = Math.max(0.00001, pMax - pMin);
      return probToRange(prob, 1.05, 300.0 * scopeScale, streakPenalty);
    }

    case "quiet": {
      const durationDays = (params.minutes || 60) / 1440;
      const prob = poissonCDF(historicalDailyRate * durationDays, 0);
      const minutes = params.minutes || 60;
      if (minutes <= 5)       return probToRange(prob, 1.05, 3.0 * scopeScale, streakPenalty);
      else if (minutes <= 30) return probToRange(prob, 2.0,  12.0 * scopeScale, streakPenalty);
      else if (minutes <= 60) return probToRange(prob, 5.0,  30.0 * scopeScale, streakPenalty);
      else                    return probToRange(prob, 15.0, 80.0 * scopeScale, streakPenalty);
    }

    case "night": {
      const prob0 = poissonCDF(historicalDailyRate * (6 / 24), 0);
      const prob = params.direction === "no" ? prob0 : 1 - prob0;
      return probToRange(prob, 1.05, 15.0 * scopeScale, streakPenalty);
    }

    default:
      return defaultMultiplier;
  }
}
