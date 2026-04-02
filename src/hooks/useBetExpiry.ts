import { useEffect, useState } from "react";
import { getBetEndTime } from "@/lib/bet-generator";

interface Bet {
  id: string;
  type: string;
  created_at: string;
  status: string;
}

export function useBetExpiry(bet: Bet) {
  const [expiry, setExpiry] = useState("00:00");

  useEffect(() => {
    if (bet.status !== "open") return;

    const updateExpiry = () => {
      const now = new Date().getTime();
      const created = new Date(bet.created_at).getTime();
      const end = getBetEndTime(bet.id, created); // Note: getBetEndTime takes betId and createdAt
      const remaining = end - now;

      if (remaining <= 0) {
        setExpiry("00:00");
      } else {
        const totalSec = Math.floor(remaining / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        
        if (h > 0) {
          setExpiry(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
        } else {
          setExpiry(`${m}:${String(s).padStart(2, "0")}`);
        }
      }
    };

    updateExpiry();
    const timer = setInterval(updateExpiry, 1000);
    return () => clearInterval(timer);
  }, [bet.id, bet.created_at, bet.status]);

  return expiry;
}
