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
    const fetchAlerts = async () => {
      try {
        const res = await fetch(
          "https://corsproxy.io/?https://www.oref.org.il/WarningMessages/alert/alerts.json",
          {
            headers: { "X-Requested-With": "XMLHttpRequest" },
          }
        );
        const text = await res.text();
        if (text && text.trim() !== "") {
          try {
            const data = JSON.parse(text);
            if (data && (Array.isArray(data) ? data.length > 0 : data.data)) {
              const parsed = Array.isArray(data) ? data : [data];
              const newAlerts: Alert[] = parsed.map((a: any, i: number) => ({
                id: `${Date.now()}-${i}`,
                areas: a.data ? a.data.split(", ") : [a.title || "אזור לא ידוע"],
                time: new Date().toISOString(),
                type: a.cat || "missiles",
              }));
              setAlerts((prev) => [...newAlerts, ...prev].slice(0, 50));
              setTodayCount((c) => c + newAlerts.length);
            }
          } catch {}
        }
      } catch {}
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  return { alerts, todayCount };
}
