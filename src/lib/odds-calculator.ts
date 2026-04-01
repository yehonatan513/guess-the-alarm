import { AlertStats } from "@/hooks/useAlertStats";

// Iterative Poisson CDF: P(X <= k)
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

// Smooth multiplier curve — no hard cap jumps.
function probToMultiplier(prob: number, edge: number, maxMult: number): number {
  const p = Math.max(0.001, Math.min(0.999, prob));
  const raw = (1 / p) * edge;
  const curved = maxMult * (1 - Math.exp(-raw / maxMult));
  const final = Math.max(1.01, Math.min(maxMult, curved));
  return parseFloat(final.toFixed(2));
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
}

const MIN_ALERTS_FOR_SMART_ODDS = 300;

const HOUSE_EDGE: Record<string, number> = {
  quiet:     0.88,
  night:     0.90,
  overunder: 0.92,
  total:     0.90,
};

const MAX_MULT: Record<string, number> = {
  quiet:     400,
  night:     25,
  overunder: 120,
  total:     250,
};

export function calculateSmartOdds(params: SmartOddsParams): number {
  const {
    stats, scope, location, type, defaultMultiplier,
    todayCount = 0,
    minutesLeftToday = 1440,
  } = params;

  const edge    = HOUSE_EDGE[type] ?? 0.90;
  const maxMult = MAX_MULT[type] ?? 100;

  if (!stats || stats.total_alerts < MIN_ALERTS_FOR_SMART_ODDS || !stats.tracking_started_at) {
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

  const historicalDailyRate = Math.max(0.01, count / daysTracked);
  const fractionLeft = Math.max(0, minutesLeftToday) / 1440;
  const lambdaRemaining = historicalDailyRate * fractionLeft;

  let probability = 0.5;

  switch (type) {
    case "overunder": {
      const threshold = params.threshold ?? 0;
      const remainingNeeded = threshold - todayCount;
      if (params.direction === "under") {
        if (remainingNeeded < 0) return 1.01;
        probability = poissonCDF(lambdaRemaining, remainingNeeded);
      } else {
        if (remainingNeeded < 0) return 1.01;
        probability = 1 - poissonCDF(lambdaRemaining, remainingNeeded);
      }
      break;
    }

    case "total": {
      const min = params.min ?? 0;
      const max = params.max !== undefined && params.max !== null ? params.max : 1000;
      const remainingForMax = max - todayCount;
      const remainingForMin = min - todayCount;
      const pMax = poissonCDF(lambdaRemaining, Math.max(0, remainingForMax));
      const pMin = poissonCDF(lambdaRemaining, Math.max(-1, remainingForMin - 1));
      probability = Math.max(0.001, pMax - pMin);
      break;
    }

    case "quiet": {
      const durationDays = (params.minutes || 60) / 1440;
      const expectedInWindow = historicalDailyRate * durationDays;
      probability = poissonCDF(expectedInWindow, 0);
      break;
    }

    case "night": {
      const expectedInWindow = historicalDailyRate * (6 / 24);
      const probZero = poissonCDF(expectedInWindow, 0);
      probability = params.direction === "no" ? probZero : 1 - probZero;
      break;
    }

    default:
      return defaultMultiplier;
  }

  probability = Math.max(0.001, Math.min(0.999, probability));
  return probToMultiplier(probability, edge, maxMult);
}
