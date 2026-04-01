import { useState, useEffect, useCallback, useMemo } from "react";
import { REGION_CITIES } from "@/lib/cities-data";

interface Alert {
  id: string;
  areas: string[];
  time: string;
  type: string;
}

interface AlertsState {
  alerts: Alert[];
  activeAlerts: Alert[];
  todayCount: number;
  todayCountByCity: Record<string, number>;
  todayCountByRegion: Record<string, number>;
  error: string | null;
  lastUpdated: Date | null;
}

const PROXY_URL = import.meta.env.VITE_PROXY_URL || "https://cvokdzmibrxadrpiczow.supabase.co/functions/v1/fetch-alerts";

export function useAlerts() {
  const [state, setState] = useState<AlertsState>({
    alerts: [],
    activeAlerts: [],
    todayCount: 0,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(PROXY_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const activeAlerts: Alert[] = [];
      if (data.active && Array.isArray(data.active) && data.active.length > 0) {
        data.active.forEach((a: any, i: number) => {
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

      // Midnight of today (local time) as Unix timestamp seconds
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

      if (data.history && Array.isArray(data.history)) {
        data.history.forEach((group: any) => {
          if (group.alerts && Array.isArray(group.alerts)) {
            group.alerts.forEach((a: any, i: number) => {
              const alertTimeSec: number = a.time ?? 0;
              // Only count alert if it happened today (after local midnight)
              if (alertTimeSec >= todayMidnight) {
                todayCount++;
              }
              allAlerts.push({
                id: `hist-${group.id || 0}-${i}`,
                areas: Array.isArray(a.cities) ? a.cities : [a.cities || "אזור לא ידוע"],
                time: alertTimeSec ? new Date(alertTimeSec * 1000).toISOString() : new Date().toISOString(),
                type: a.threat === 0 ? "missiles" : String(a.threat),
              });
            });
          }
        });
      }

      setState({
        alerts: allAlerts, // keep all — bet resolution needs the full history to settle old bets
        activeAlerts,
        todayCount,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (err: any) {
      setState(prev => ({ ...prev, error: "לא ניתן לטעון אזעקות", lastUpdated: new Date() }));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return state;
}
