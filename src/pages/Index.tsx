import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/App";
import { useAlerts } from "@/hooks/useAlerts";
import { useBetResolution } from "@/hooks/useBetResolution";
import { BETS, BetTemplate } from "@/lib/bets-data";
import BetModal from "@/components/BetModal";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

const formatCoins = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString("he-IL");
};

const Index = () => {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { alerts, activeAlerts, todayCount, error } = useAlerts();
  const [tab, setTab] = useState<"common" | "dynamic">("common");

  // Pass alert data so useBetResolution doesn't need its own useAlerts() instance
  useBetResolution({ alerts, activeAlerts, todayCount });
  const [selectedBet, setSelectedBet] = useState<BetTemplate | null>(null);
  const filtered = BETS.filter((b) => b.category === tab);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Global TopHeader is handling the top bar now */}

      <div className="max-w-lg mx-auto px-4 space-y-4 mt-4">
        {/* Active alert banner */}
        {activeAlerts.length > 0 && (
          <div className="bg-destructive border border-destructive rounded-lg p-3 text-center animate-pulseAlert">
            <p className="text-destructive-foreground text-sm font-black">🚨 אזעקה פעילה!</p>
            <p className="text-destructive-foreground text-xs mt-1">
              {activeAlerts.flatMap((a) => a.areas).join(", ")}
            </p>
          </div>
        )}

        {/* API error notice */}
        {error && (
          <div className="bg-muted border border-border rounded-lg p-2 text-center animate-fadeIn">
            <p className="text-muted-foreground text-xs">⚠️ {error} — מנסה שוב...</p>
          </div>
        )}

        {/* Warning */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2 text-center animate-fadeIn">
          <p className="text-destructive text-xs font-bold">⚠️ לא כסף אמיתי - לבידור בלבד</p>
        </div>

        {/* Recent alerts */}
        <div className="space-y-2 animate-slideInUp" style={{ animationDelay: "60ms" }}>
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
        <div className="space-y-3 animate-slideInUp" style={{ animationDelay: "120ms" }}>
          <h2 className="text-foreground font-bold text-sm">📊 שוק ההימורים</h2>
          <div className="flex bg-card rounded-lg p-1 border border-border">
            <button
              onClick={() => setTab("common")}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all duration-200 ${
                tab === "common" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              הימורים נפוצים
            </button>
            <button
              onClick={() => setTab("dynamic")}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all duration-200 ${
                tab === "dynamic" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              יחסים דינמיים
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {filtered.map((bet, i) => (
              <button
                key={bet.id}
                onClick={() => setSelectedBet(bet)}
                className="bg-card border border-border rounded-xl p-3 text-right hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 transition-all duration-200 active:scale-95 space-y-1 animate-fadeIn"
                style={{ animationDelay: `${i * 40}ms` }}
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
