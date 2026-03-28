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

        // History - flatten nested alerts from history groups
        if (data.history && Array.isArray(data.history)) {
          const allAlerts: Alert[] = [];
          let totalCount = 0;
          data.history.forEach((group: any) => {
            if (group.alerts && Array.isArray(group.alerts)) {
              totalCount += group.alerts.length;
              group.alerts.forEach((a: any, i: number) => {
                allAlerts.push({
                  id: `hist-${group.id || 0}-${i}`,
                  areas: Array.isArray(a.cities) ? a.cities : [a.cities || "אזור לא ידוע"],
                  time: a.time ? new Date(a.time * 1000).toISOString() : new Date().toISOString(),
                  type: a.threat === 0 ? "missiles" : String(a.threat),
                });
              });
            }
          });
          setTodayCount(totalCount);
          setAlerts(allAlerts.slice(0, 30));
        }
      } catch {}
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return { alerts, activeAlerts, todayCount };
}
