import { useState, useEffect } from "react";

interface Alert {
  id: string;
  areas: string[];
  time: string;
  type: string;
}

const PROXY = "https://corsproxy.io/?url=";
const HEADERS = {
  Referer: "https://www.oref.org.il/",
  "X-Requested-With": "XMLHttpRequest",
};

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch current active alerts
      try {
        const res = await fetch(
          PROXY + encodeURIComponent("https://www.oref.org.il/WarningMessages/alert/alerts.json"),
          { headers: HEADERS }
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

      // Fetch history for today's count - try oref first, fallback to tzevaadom
      try {
        let data: any[] | null = null;

        try {
          const res = await fetch(
            PROXY + encodeURIComponent("https://www.oref.org.il/WarningMessages/History/AlertsHistory.json"),
            { headers: HEADERS }
          );
          const text = await res.text();
          if (text && text.trim() !== "") {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0) data = parsed;
          }
        } catch {}

        // Fallback to tzevaadom
        if (!data) {
          try {
            const res = await fetch("https://alerts.tzevaadom.co.il/history");
            const parsed = await res.json();
            if (Array.isArray(parsed) && parsed.length > 0) data = parsed;
          } catch {}
        }

        if (data && data.length > 0) {
          setTodayCount(data.length);
          const historyAlerts: Alert[] = data.slice(0, 30).map((a: any, i: number) => ({
            id: `hist-${a.alertDate || a.date || i}-${i}`,
            areas: a.data
              ? a.data.split(", ")
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

  return { alerts, todayCount };
}
