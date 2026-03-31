import { useEffect, useRef } from "react";
import { ref, runTransaction } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAlertsContext } from "@/contexts/AlertsContext";
import { REGION_CITIES } from "@/lib/bet-generator";

// ── Build a reverse map: city → region (O(1) lookup instead of O(n*m)) ────────
const CITY_TO_REGION = new Map<string, string>();
for (const [regionName, cities] of Object.entries(REGION_CITIES)) {
  for (const city of cities) {
    CITY_TO_REGION.set(city, regionName);
  }
}

function findRegion(city: string): string {
  // Exact match first
  if (CITY_TO_REGION.has(city)) return CITY_TO_REGION.get(city)!;
  // Partial match fallback (alert areas sometimes include suffixes)
  for (const [knownCity, region] of CITY_TO_REGION.entries()) {
    if (city.includes(knownCity) || knownCity.includes(city)) return region;
  }
  return "אחר";
}

export const useDataIngestion = () => {
  const { alerts } = useAlertsContext();
  const processingRef = useRef(false);

  useEffect(() => {
    if (!alerts || alerts.length === 0 || processingRef.current) return;

    const ingestNewData = async () => {
      processingRef.current = true;
      try {
        await runTransaction(ref(db, "alert_stats"), (currentData) => {
          if (!currentData) currentData = {};

          const lastProcessedTime = currentData.last_processed_time || 0;
          let maxTimeSeen = lastProcessedTime;
          let totalNewAlerts = 0;
          const newStatsUpdates: Record<string, number> = {};

          alerts.forEach((alert) => {
            const alertTimeSec = Math.floor(new Date(alert.time).getTime() / 1000);

            if (alertTimeSec > lastProcessedTime) {
              if (alertTimeSec > maxTimeSeen) maxTimeSeen = alertTimeSec;
              totalNewAlerts++;

              alert.areas.forEach((city) => {
                const sanitizedCity = city.replace(/[.#$[\]]/g, "_");
                newStatsUpdates[`cities/${sanitizedCity}`] = (newStatsUpdates[`cities/${sanitizedCity}`] || 0) + 1;

                // O(1) region lookup via pre-built map
                const foundRegion = findRegion(city);
                const sanitizedRegion = foundRegion.replace(/[.#$[\]]/g, "_");
                newStatsUpdates[`regions/${sanitizedRegion}`] = (newStatsUpdates[`regions/${sanitizedRegion}`] || 0) + 1;
              });
            }
          });

          if (totalNewAlerts === 0) return; // abort transaction — no new data

          if (!currentData.tracking_started_at) {
            currentData.tracking_started_at = Date.now();
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
      } catch (err) {
        console.error("Data ingestion failed:", err);
      } finally {
        processingRef.current = false;
      }
    };

    ingestNewData();
  }, [alerts]);
};
