import { useEffect, useRef } from "react";
import { ref, runTransaction } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAlerts } from "./useAlerts";
import { REGION_CITIES } from "@/lib/bet-generator";

export const useDataIngestion = () => {
  const { alerts } = useAlerts();
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
            // alert.time is an ISO string here. We need the unix timestamp in seconds.
            const alertTimeSec = Math.floor(new Date(alert.time).getTime() / 1000);
            
            if (alertTimeSec > lastProcessedTime) {
              if (alertTimeSec > maxTimeSeen) {
                maxTimeSeen = alertTimeSec;
              }
              totalNewAlerts++;
              
              alert.areas.forEach((city) => {
                const sanitizedCity = city.replace(/[.#$[\]]/g, "_");
                newStatsUpdates[`cities/${sanitizedCity}`] = (newStatsUpdates[`cities/${sanitizedCity}`] || 0) + 1;
                
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

          // If no new alerts, abort transaction (returns undefined inside runTransaction aborts it usually, or just return same data)
          if (totalNewAlerts === 0) {
            return;
          }

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
