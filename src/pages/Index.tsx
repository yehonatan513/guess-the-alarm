import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/App";
import { useAlertsContext } from "@/contexts/AlertsContext";
import { useAlertStats } from "@/hooks/useAlertStats";
import {
  CITIES, REGIONS, BET_TYPE_GROUPS, generateBets,
  BetScope, BetType, GeneratedBet
} from "@/lib/bet-generator";
import BetModal from "@/components/BetModal";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

const SCOPE_TABS: { id: BetScope; label: string; icon: string }[] = [
  { id: "city",    label: "עיר",   icon: "🏙️" },
  { id: "region",  label: "אזור",  icon: "🗺️" },
  { id: "general", label: "כללי",  icon: "🌍" },
];

const Index = () => {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const { alerts, activeAlerts, todayCount, todayCountByCity, todayCountByRegion, error } = useAlertsContext();
  const { stats } = useAlertStats();

  // Bet builder state
  const [scope, setScope] = useState<BetScope>("general");
  const [location, setLocation] = useState<string>("כללי");
  const [citySearch, setCitySearch] = useState("");
  const [selectedType, setSelectedType] = useState<BetType | null>(null);
  const [selectedBet, setSelectedBet] = useState<GeneratedBet | null>(null);

  // ⚡ Bolt: Pagination state for large lists to prevent DOM bloat
  const [visibleCities, setVisibleCities] = useState(50);

  const [minutesLeftToday, setMinutesLeftToday] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      setMinutesLeftToday(Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 60000)));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredCities = useMemo(
    () => CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase())),
    [citySearch]
  );

  // ⚡ Bolt: Reset pagination when search changes
  useEffect(() => {
    setVisibleCities(50);
  }, [citySearch, scope]);

  // ⚡ Bolt: Handle scroll to load more cities
  const handleCitiesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      setVisibleCities(prev => Math.min(prev + 50, filteredCities.length));
    }
  };

  const locationReady = useMemo(() => {
    if (scope === "general") return true;
    if (!location || location === "כללי") return false;
    if (scope === "city") return CITIES.includes(location);
    if (scope === "region") return REGIONS.includes(location);
    return false;
  }, [scope, location]);

  const bets = useMemo(() => {
    if (!selectedType || !locationReady) return [];
    return generateBets(
      scope,
      selectedType,
      location || "כללי",
      stats,
      todayCount,
      minutesLeftToday,
      todayCountByCity,
      todayCountByRegion,
      profile?.consecutive_wins || 0
    );
  }, [scope, selectedType, location, locationReady, stats, todayCount, minutesLeftToday, todayCountByCity, todayCountByRegion, profile?.consecutive_wins]);

  const handleScopeChange = (s: BetScope) => {
    setScope(s);
    setLocation(s === "general" ? "כללי" : "");
    setSelectedType(null);
    setCitySearch("");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
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

        {/* ── Bet Builder ── */}
        <div className="space-y-5 animate-slideInUp" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-foreground font-bold text-sm">🎰 בנה הימור</h2>
              {minutesLeftToday > 0 && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  ⏱️ {Math.floor(minutesLeftToday / 60)}h {minutesLeftToday % 60}m נותרו היום
                </p>
              )}
            </div>
            {stats && stats.total_alerts >= 300 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-500 rounded-full border border-green-500/20 text-xs font-bold animate-pulse">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                יחסים חכמים פעילים
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 text-xs font-medium">
                🧠 המערכת לומדת נתונים ({stats?.total_alerts || 0}/300)
              </div>
            )}
          </div>

          {/* Step 1: Bet type */}
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-semibold">שלב 1 — סוג הימור</p>
            <div className="grid grid-cols-2 gap-3">
              {BET_TYPE_GROUPS.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedType(selectedType === group.id ? null : group.id)}
                  className={`border rounded-xl p-4 text-right transition-all duration-200 active:scale-95 space-y-1.5 ${
                    selectedType === group.id
                      ? "bg-primary/10 border-primary shadow-lg shadow-primary/10"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-2xl block">{group.emoji}</span>
                  <p className="text-foreground text-sm font-bold">{group.title}</p>
                  <p className="text-muted-foreground text-xs leading-tight">{group.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Scope */}
          {selectedType && (
            <div className="space-y-1.5 animate-fadeIn">
              <p className="text-muted-foreground text-xs font-semibold">שלב 2 — טווח ההימור</p>
              <div className="flex bg-card rounded-xl p-1 border border-border gap-1">
                {SCOPE_TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleScopeChange(t.id)}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex flex-col items-center gap-0.5 ${
                      scope === t.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="text-base">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Location picker */}
          {selectedType && scope === "city" && (
            <div className="space-y-2 animate-fadeIn">
              <p className="text-muted-foreground text-xs font-semibold">שלב 3 — בחר עיר</p>
              <input
                type="text"
                placeholder="🔍 חפש עיר..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
                dir="rtl"
              />
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto" onScroll={handleCitiesScroll}>
                {filteredCities.slice(0, visibleCities).map((city) => (
                  <button
                    key={city}
                    onClick={() => { setLocation(city); setCitySearch(""); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                      location === city
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card border border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
              {location && location !== "כללי" && (
                <p className="text-primary text-xs font-bold text-center">📍 נבחר: {location}</p>
              )}
            </div>
          )}

          {selectedType && scope === "region" && (
            <div className="space-y-2 animate-fadeIn">
              <p className="text-muted-foreground text-xs font-semibold">שלב 3 — בחר אזור</p>
              <div className="grid grid-cols-2 gap-2">
                {REGIONS.map((region) => (
                  <button
                    key={region}
                    onClick={() => setLocation(region)}
                    className={`py-3 px-3 rounded-xl text-xs font-bold transition-all duration-200 text-right ${
                      location === region
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-card border border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Placeholder when no location selected */}
          {selectedType && !locationReady && (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <p className="text-muted-foreground text-sm">
                {scope === "city" ? "🏙️ בחר עיר כדי להמשיך" : "🗺️ בחר אזור כדי להמשיך"}
              </p>
            </div>
          )}

          {/* Step 4: Generated bets */}
          {selectedType && locationReady && bets.length > 0 && (
            <div className="space-y-2 animate-slideInUp">
              <p className="text-muted-foreground text-xs font-semibold">
                {scope === "general" ? "שלב 3" : "שלב 4"} — בחר הימור
              </p>
              <div className="space-y-2">
                {bets.map((bet, i) => {
                  const isLocked = bet.multiplier === -1;
                  return (
                    <button
                      key={bet.id}
                      onClick={() => !isLocked && setSelectedBet(bet)}
                      className={`w-full bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between transition-all duration-150 animate-fadeIn ${
                        isLocked
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:border-primary/60 hover:bg-primary/5 active:scale-98"
                      }`}
                      style={{ animationDelay: `${i * 35}ms` }}
                      disabled={isLocked}
                    >
                      {isLocked ? (
                        <span className="text-xs text-muted-foreground font-bold">הוכרע היום ✓</span>
                      ) : (
                        <span className="bg-primary/15 text-primary font-black text-sm px-2 py-0.5 rounded-md">
                          x{bet.multiplier}
                        </span>
                      )}
                      <div className="text-right">
                        <p className="text-foreground text-sm font-bold">
                          {bet.emoji} {bet.title}
                        </p>
                        <p className="text-muted-foreground text-xs mt-0.5">{bet.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <BetModal bet={selectedBet} open={!!selectedBet} onClose={() => setSelectedBet(null)} />
    </div>
  );
};

export default Index;
