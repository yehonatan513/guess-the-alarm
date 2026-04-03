import { useState, useEffect, useCallback, useMemo } from "react";
import { REGION_CITIES } from "@/lib/cities-data";

interface Alert {
  id: string;
  areas: string[];
  time: string;
  type: string;
}

interface RawAlert {
  data?: string;
  title?: string;
  cat?: string;
  time?: number;
  cities?: string | string[];
  threat?: number;
}

interface HistoryGroup {
  id?: number | string;
  alerts?: RawAlert[];
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
  const cityToRegion = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [region, cities] of Object.entries(REGION_CITIES)) {
      for (const city of cities) {
        map[city] = region;
      }
    }
    return map;
  }, []);

  const [state, setState] = useState<AlertsState>({
    alerts: [],
    activeAlerts: [],
    todayCount: 0,
    todayCountByCity: {},
    todayCountByRegion: {},
    error: null,
    lastUpdated: null,
  });

  const [retryDelay, setRetryDelay] = useState(10000);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(PROXY_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      // ... same processing logic ...
      const activeAlerts: Alert[] = [];
      if (data.active && Array.isArray(data.active) && data.active.length > 0) {
        data.active.forEach((a: RawAlert, i: number) => {
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
      const todayCountByCity: Record<string, number> = {};
      const todayCountByRegion: Record<string, number> = {};

      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

      if (data.history && Array.isArray(data.history)) {
        data.history.forEach((group: HistoryGroup) => {
          if (group.alerts && Array.isArray(group.alerts)) {
            group.alerts.forEach((a: RawAlert, i: number) => {
              const alertTimeSec: number = a.time ?? 0;
              const cities = Array.isArray(a.cities) ? a.cities : [a.cities || "אזור לא ידוע"];
              if (alertTimeSec >= todayMidnight) {
                todayCount += cities.length;
                for (const cityName of cities) {
                  todayCountByCity[cityName] = (todayCountByCity[cityName] || 0) + 1;
                  const region = cityToRegion[cityName];
                  if (region) {
                    todayCountByRegion[region] = (todayCountByRegion[region] || 0) + 1;
                  }
                }
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
        alerts: allAlerts,
        activeAlerts,
        todayCount,
        todayCountByCity,
        todayCountByRegion,
        error: null,
        lastUpdated: new Date(),
      });
      setRetryDelay(10000); // Reset on success
    } catch (err: any) {
      console.error("Fetch error:", err);
      setState(prev => ({ ...prev, error: "לא ניתן לטעון אזעקות", lastUpdated: new Date() }));
      setRetryDelay(prev => Math.min(prev * 2, 60000)); // Exponential backoff up to 1m
    }
  }, [cityToRegion]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, retryDelay);
    return () => clearInterval(timer);
  }, [fetchData, retryDelay]);

  return state;
}
