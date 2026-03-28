import { useState, useEffect } from "react";

interface Alert {
  id: string;
  areas: string[];
  time: string;
  type: string;
}

const PROXY_URL = "https://cvokdzmibrxadrpiczow.supabase.co/functions/v1/fetch-alerts";

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(PROXY_URL);
        const data = await res.json();

        // Active alerts
        if (data.active && Array.isArray(data.active) && data.active.length > 0) {
          const active: Alert[] = data.active.map((a: any, i: number) => ({
            id: `active-${Date.now()}-${i}`,
            areas: a.data ? (Array.isArray(a.data) ? a.data : a.data.split(", ")) : [a.title || "אזור לא ידוע"],
            time: new Date().toISOString(),
            type: a.cat || "missiles",
          }));
          setActiveAlerts(active);
        } else {
          setActiveAlerts([]);
        }

        // History
        if (data.history && Array.isArray(data.history)) {
          setTodayCount(data.history.length);
          const historyAlerts: Alert[] = data.history.slice(0, 30).map((a: any, i: number) => ({
            id: `hist-${a.alertDate || a.date || i}-${i}`,
            areas: a.data
              ? (Array.isArray(a.data) ? a.data : a.data.split(", "))
              : a.cities
              ? (Array.isArray(a.cities) ? a.cities : [a.cities])
              : [a.title || "אזור לא ידוע"],
            time: a.alertDate
              ? new Date(a.alertDate).toISOString()
              : a.date
              ? new Date(a.date).toISOString()
              : new Date().toISOString(),
            type: a.cat || a.category || "missiles",
          }));
          setAlerts(historyAlerts);
        }
      } catch {}
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return { alerts, activeAlerts, todayCount };
}
