import React, { useEffect, useState } from "react";
import { ref, query, orderByChild, equalTo, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { getBetEndTime } from "@/lib/bet-generator";

interface Bet {
  id: string;
  type: string;
  description: string;
  amount: number;
  multiplier: number;
  status: string;
  coins_won: number;
  created_at: string;
}

const formatCoins = (n: number) => n.toLocaleString("he-IL");

// Calculate when an open bet expires
function getBetExpiry(bet: Bet): string {
  const now = new Date().getTime();
  const created = new Date(bet.created_at).getTime();
  const end = getBetEndTime(bet.type, created);
  const remaining = end - now;

  if (remaining <= 0) return "00:00";
  return msToLabel(remaining);
}

function msToLabel(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const MyBets = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [tab, setTab] = useState<"open" | "history">("open");
  const [, setTick] = useState(0);

  // Tick every second so the countdown updates live
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    const betsRef = query(ref(db, "bets"), orderByChild("uid"), equalTo(user.uid));
    const unsub = onValue(betsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data).map(([id, v]: any) => ({ id, ...v }));
        arr.sort((a: Bet, b: Bet) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setBets(arr);
      } else {
        setBets([]);
      }
    });
    return () => unsub();
  }, [user]);

  const filtered = bets.filter((b) =>
    tab === "open" ? b.status === "open" : b.status !== "open"
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="border-b border-border px-4 py-4 mb-2">
        <h1 className="text-primary font-black text-lg text-center">📋 ההימורים שלי</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4 mt-4">
        <div className="flex bg-card rounded-lg p-1 border border-border">
          <button
            onClick={() => setTab("open")}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all duration-200 ${
              tab === "open" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            פתוחים {bets.filter(b => b.status === "open").length > 0 && `(${bets.filter(b => b.status === "open").length})`}
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all duration-200 ${
              tab === "history" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            היסטוריה
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center animate-fadeIn">
            <p className="text-muted-foreground text-sm">
              {tab === "open" ? "אין הימורים פתוחים 🎲" : "אין היסטוריה עדיין"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((bet, i) => {
              const expiry = bet.status === "open" ? getBetExpiry(bet) : null;
              const isExpiredDisplay = expiry === "00:00";
              const isUrgent = expiry && !isExpiredDisplay && expiry.startsWith("0:");

              return (
                <div
                  key={bet.id}
                  className="bg-card border border-border rounded-xl p-4 space-y-2 animate-fadeIn"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex justify-between items-start">
                    <Badge
                      variant={
                        bet.status === "open"
                          ? "secondary"
                          : bet.status === "won"
                          ? "default"
                          : "destructive"
                      }
                      className="text-xs"
                    >
                      {bet.status === "open" && "פתוח"}
                      {bet.status === "won" && "ניצחון! 🏆"}
                      {bet.status === "lost" && "הפסד ✗"}
                    </Badge>
                    <span className="text-primary font-black text-sm">x{bet.multiplier}</span>
                  </div>

                  <p className="text-foreground text-sm font-bold">{bet.description}</p>

                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>🪙 {formatCoins(bet.amount)}</span>
                    <span>{new Date(bet.created_at).toLocaleDateString("he-IL")}</span>
                  </div>

                  {/* Expiry countdown for open bets */}
                  {expiry && (
                    <div className={`flex items-center gap-1.5 text-xs font-mono font-bold px-2 py-1 rounded-lg w-fit ${
                      isExpiredDisplay
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse"
                        : isUrgent
                        ? "bg-destructive/15 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}>
                      <span>{isExpiredDisplay ? "⚡" : isUrgent ? "🔴" : "⏱️"}</span>
                      <span>{isExpiredDisplay ? "מחשב תוצאה..." : `נסגר בעוד ${expiry}`}</span>
                    </div>
                  )}

                  {bet.status === "won" && (
                    <p className="text-primary font-bold text-sm">+{formatCoins(bet.coins_won)} 🪙</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBets;
