import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

export interface AlertStats {
  tracking_started_at: number;
  total_alerts: number;
  last_processed_time: number;
  cities: Record<string, number>;
  regions: Record<string, number>;
}

export const useAlertStats = () => {
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const statsRef = ref(db, "alert_stats");
    const unsub = onValue(statsRef, (snap) => {
      if (snap.exists()) {
        setStats(snap.val() as AlertStats);
      } else {
        setStats(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { stats, loading };
};
