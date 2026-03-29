import { AlertStats } from "@/hooks/useAlertStats";

// Iterative Poisson CDF for P(X <= k)
function poissonCDF(lambda: number, k: number): number {
  if (k < 0) return 0;
  if (lambda <= 0) return 1;

  let p = Math.exp(-lambda); // P(0)
  let sum = p;
  for (let i = 1; i <= k; i++) {
    p = p * (lambda / i);
    sum += p;
  }
  return sum;
}

// Convert a true probability [0,1] into a gaming multiplier with a house edge
function probToMultiplier(prob: number, edge: number = 0.92): number {
  if (prob <= 0.001) return 50; // Cap max payout artificially to prevent exploits
  if (prob >= 0.99) return 1.01; // Minimum floor

  const rawOdds = 1 / prob;
  const houseOdds = rawOdds * edge;

  // Clamp
  const finalOdds = Math.max(1.01, Math.min(50, houseOdds));
  return parseFloat(finalOdds.toFixed(2));
}

interface SmartOddsParams {
  stats: AlertStats | null;
  scope: "city" | "region" | "general";
  location: string;
  type: "quiet" | "night" | "overunder" | "total";
  defaultMultiplier: number;
  // Specific constraints
  minutes?: number; // for quiet
  threshold?: number; // for over/under
  direction?: "over" | "under" | "yes" | "no";
  min?: number; // for total
  max?: number | null; 
}

const MIN_ALERTS_FOR_SMART_ODDS = 300;

export function calculateSmartOdds(params: SmartOddsParams): number {
  const { stats, scope, location, type, defaultMultiplier } = params;

  // 1. Fallback if not enough data
  if (!stats || stats.total_alerts < MIN_ALERTS_FOR_SMART_ODDS || !stats.tracking_started_at) {
    return defaultMultiplier;
  }

  // 2. Calculate daily rate (lambda)
  const now = Date.now();
  // Safe floor to 1 day to avoid dividing by 0 or fractions initially
  const daysTracked = Math.max(1, (now - stats.tracking_started_at) / (1000 * 60 * 60 * 24)); 
  
  const sanitizedLocation = location.replace(/[.#$[\]]/g, "_");
  let count = 0;

  if (scope === "general" || location === "כללי") {
    count = stats.total_alerts;
  } else if (scope === "city") {
    count = stats.cities?.[sanitizedLocation] || 0;
  } else if (scope === "region") {
    count = stats.regions?.[sanitizedLocation] || 0;
  }

  // To prevent zero divisions in math, if a city had 0 alarms we assume a tiny baseline
  const dailyRate = Math.max(0.01, count / daysTracked);

  let probability = 0.5;

  // 3. Compute Probability based on bet type
  switch (type) {
    case "quiet": {
      // e.g., NO alarms in X minutes
      const durationDays = (params.minutes || 60) / 1440;
      const expectedInWindow = dailyRate * durationDays;
      probability = poissonCDF(expectedInWindow, 0); // P(0 alarms)
      break;
    }
    case "night": {
      // 6 hours window
      const durationDays = 6 / 24;
      const expectedInWindow = dailyRate * durationDays;
      const probZero = poissonCDF(expectedInWindow, 0);
      
      if (params.direction === "no") {
        probability = probZero; // Wants NO alarms
      } else {
        probability = 1 - probZero; // Wants AT LEAST 1 alarm (YES)
      }
      break;
    }
    case "overunder": {
      // whole day window (T=1)
      const expected = dailyRate;
      const threshold = params.threshold || 0;
      const probUnderOrEqual = poissonCDF(expected, threshold); // P(X <= threshold)
      // Since 'over' means STRICTLY greater (X > threshold):
      // P(X > threshold) = 1 - P(X <= threshold)
      if (params.direction === "under") {
        probability = probUnderOrEqual;
      } else {
        probability = 1 - probUnderOrEqual; // "over"
      }
      break;
    }
    case "total": {
      // between min and max inclusive in a day
      const expected = dailyRate;
      const min = params.min || 0;
      const max = params.max !== undefined && params.max !== null ? params.max : 1000;
      
      const probUpToMax = poissonCDF(expected, max);
      const probUpToMinMinusOne = poissonCDF(expected, min - 1);
      
      probability = probUpToMax - probUpToMinMinusOne;
      break;
    }
    default:
      return defaultMultiplier;
  }

  // 4. Return as Multiplier
  return probToMultiplier(probability);
}
