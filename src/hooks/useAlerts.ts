import { useState, useEffect } from "react";

interface Alert {
  id: string;
  areas: string[];
  time: string;
  type: string;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch current active alerts
      try {
        const res = await fetch(
          "https://corsproxy.io/?url=https://www.oref.org.il/WarningMessages/alert/alerts.json",
          { headers: { "X-Requested-With": "XMLHttpRequest" } }
        );
        const text = await res.text();
        if (text && text.trim() !== "") {
          try {
            const data = JSON.parse(text);
            if (data && (Array.isArray(data) ? data.length > 0 : data.data)) {
              const parsed = Array.isArray(data) ? data : [data];
              const newAlerts: Alert[] = parsed.map((a: any, i: number) => ({
                id: `live-${Date.now()}-${i}`,
                areas: a.data ? a.data.split(", ") : [a.title || "אזור לא ידוע"],
                time: new Date().toISOString(),
                type: a.cat || "missiles",
              }));
              setAlerts((prev) => {
                const existingIds = new Set(prev.map((p) => p.areas.join(",")));
                const unique = newAlerts.filter((n) => !existingIds.has(n.areas.join(",")));
                return [...unique, ...prev].slice(0, 50);
              });
            }
          } catch {}
        }
      } catch {}

      // Fetch history for today's count and recent alerts list
      try {
        const res = await fetch(
          "https://corsproxy.io/?url=https://www.oref.org.il/WarningMessages/alert/alertsHistory.json",
          { headers: { "X-Requested-With": "XMLHttpRequest" } }
        );
        const text = await res.text();
        if (text && text.trim() !== "") {
          try {
            const data = JSON.parse(text);
            if (Array.isArray(data) && data.length > 0) {
              setTodayCount(data.length);
              const historyAlerts: Alert[] = data
                .slice(0, 30)
                .map((a: any, i: number) => ({
                  id: `hist-${a.alertDate || i}-${i}`,
                  areas: a.data ? a.data.split(", ") : [a.title || "אזור לא ידוע"],
                  time: a.alertDate
                    ? new Date(a.alertDate).toISOString()
                    : new Date().toISOString(),
                  type: a.cat || "missiles",
                }));
              setAlerts(historyAlerts);
            }
          } catch {}
        }
      } catch {}
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return { alerts, todayCount };
}
