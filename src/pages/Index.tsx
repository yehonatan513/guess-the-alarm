import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { BETS, BetTemplate } from "@/lib/bets-data";
import BetModal from "@/components/BetModal";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

const formatCoins = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString("he-IL");
};

const Index = () => {
  const { profile, logout } = useAuth();
  const { alerts, activeAlerts, todayCount } = useAlerts();
  const [tab, setTab] = useState<"common" | "dynamic">("common");
  const [selectedBet, setSelectedBet] = useState<BetTemplate | null>(null);

  const filtered = BETS.filter((b) => b.category === tab);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪙</span>
            <span className="text-primary font-black text-xl">{profile ? formatCoins(profile.coins) : "0"}</span>
          </div>
          <h1 className="text-primary font-black text-sm tracking-widest">GUESS THE ALARM</h1>
        </div>
        <div className="flex justify-between items-center max-w-lg mx-auto mt-1">
          <span className="text-muted-foreground text-xs">{profile?.avatar_emoji} {profile?.username}</span>
          <button onClick={logout} className="text-xs text-muted-foreground underline">יציאה</button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4 mt-4">
        {/* Active alert banner */}
        {activeAlerts.length > 0 && (
          <div className="bg-destructive border border-destructive rounded-lg p-3 text-center animate-pulse">
            <p className="text-destructive-foreground text-sm font-black">🚨 אזעקה פעילה!</p>
            <p className="text-destructive-foreground text-xs mt-1">
              {activeAlerts.flatMap((a) => a.areas).join(", ")}
            </p>
          </div>
        )}

        {/* Warning */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2 text-center">
          <p className="text-destructive text-xs font-bold">⚠️ לא כסף אמיתי - לבידור בלבד</p>
        </div>

        {/* Recent alerts */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-foreground font-bold text-sm">🚨 אזעקות אחרונות</h2>
            <Badge variant="destructive" className="text-xs">{todayCount} היום</Badge>
          </div>
          <div className="bg-card rounded-xl p-3 max-h-32 overflow-y-auto space-y-2 border border-border">
            {alerts.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-2">אין אזעקות כרגע 🕊️</p>
            ) : (
              alerts.slice(0, 10).map((a) => (
                <div key={a.id} className="flex justify-between items-center text-xs">
                  <span className="text-foreground">📍 {a.areas.join(", ")}</span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(a.time), { locale: he, addSuffix: true })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Market toggle */}
        <div className="space-y-3">
          <h2 className="text-foreground font-bold text-sm">📊 שוק ההימורים</h2>
          <div className="flex bg-card rounded-lg p-1 border border-border">
            <button
              onClick={() => setTab("common")}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-colors ${
                tab === "common" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              הימורים נפוצים
            </button>
            <button
              onClick={() => setTab("dynamic")}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-colors ${
                tab === "dynamic" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              יחסים דינמיים
            </button>
          </div>

          {/* Bet cards grid */}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((bet) => (
              <button
                key={bet.id}
                onClick={() => setSelectedBet(bet)}
                className="bg-card border border-border rounded-xl p-3 text-right hover:border-primary/50 transition-all active:scale-95 space-y-1"
              >
                <span className="text-xl">{bet.emoji}</span>
                <p className="text-foreground text-xs font-bold leading-tight">{bet.title}</p>
                <span className="inline-block bg-primary/15 text-primary font-black text-sm px-2 py-0.5 rounded-md">
                  x{bet.multiplier}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <BetModal bet={selectedBet} open={!!selectedBet} onClose={() => setSelectedBet(null)} />
    </div>
  );
};

export default Index;
