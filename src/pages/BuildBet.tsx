import React, { useState, useMemo, useCallback } from "react";
import {
  CITIES, REGIONS, BET_TYPE_GROUPS, generateBets,
  BetScope, BetType, GeneratedBet
} from "@/lib/bet-generator";
import BetModal from "@/components/BetModal";
import { useAlertStats } from "@/hooks/useAlertStats";
import { useAlertsContext } from "@/contexts/AlertsContext";

const SCOPE_TABS: { id: BetScope; label: string; icon: string }[] = [
  { id: "city",    label: "עיר",   icon: "🏙️" },
  { id: "region",  label: "אזור",  icon: "🗺️" },
  { id: "general", label: "כללי",  icon: "🌍" },
];

const BuildBet = () => {
  const { stats } = useAlertStats();
  const { todayCount, todayCountByCity, todayCountByRegion } = useAlertsContext();
  const [scope, setScope]           = useState<BetScope>("general");
  const [location, setLocation]     = useState<string>("כללי");
  const [citySearch, setCitySearch] = useState("");
  const [selectedType, setSelectedType] = useState<BetType | null>(null);
  const [selectedBet, setSelectedBet]   = useState<GeneratedBet | null>(null);

  const filteredCities = useMemo(
    () => CITIES.filter(c => c.includes(citySearch)),
    [citySearch]
  );

  const locationReady = scope === "general" || (!!location && location !== "כללי");

  const minutesLeftToday = useMemo(() => {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 60000));
  }, []);

  const bets = useMemo(
    () => (selectedType && locationReady)
      ? generateBets(scope, selectedType, location || "כללי", stats, todayCount, minutesLeftToday, todayCountByCity, todayCountByRegion)
      : [],
    [scope, selectedType, location, locationReady, stats, todayCount, minutesLeftToday, todayCountByCity, todayCountByRegion]
  );

  const handleScopeChange = (s: BetScope) => {
    setScope(s);
    setLocation(s === "general" ? "כללי" : "");
    setSelectedType(null);
    setCitySearch("");
  };

  const handleCloseModal = useCallback(() => setSelectedBet(null), []);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="border-b border-border px-4 py-4 mb-2 flex items-center justify-between">
        <h1 className="text-primary font-black text-lg">🎰 בנה הימור</h1>
        
        {/* Smart Odds Indicator */}
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

      <div className="max-w-lg mx-auto px-4 space-y-5 mt-4">

        {/* ── Step 1: Scope tabs ── */}
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-semibold">שלב 1 — טווח ההימור</p>
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

        {/* ── Step 2: Location picker (city or region) ── */}
        {scope === "city" && (
          <div className="space-y-2 animate-fadeIn">
            <p className="text-muted-foreground text-xs font-semibold">שלב 2 — בחר עיר</p>
            <input
              type="text"
              placeholder="🔍 חפש עיר..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
              dir="rtl"
            />
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {filteredCities.map((city) => (
                <button
                  key={city}
                  onClick={() => { setLocation(city); setSelectedType(null); setCitySearch(""); }}
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
              <p className="text-primary text-xs font-bold text-center">
                📍 נבחר: {location}
              </p>
            )}
          </div>
        )}

        {scope === "region" && (
          <div className="space-y-2 animate-fadeIn">
            <p className="text-muted-foreground text-xs font-semibold">שלב 2 — בחר אזור</p>
            <div className="grid grid-cols-2 gap-2">
              {REGIONS.map((region) => (
                <button
                  key={region}
                  onClick={() => { setLocation(region); setSelectedType(null); }}
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

        {/* ── Step 3: Bet type squares ── */}
        {locationReady && (
          <div className="space-y-2 animate-fadeIn">
            <p className="text-muted-foreground text-xs font-semibold">
              {scope === "general" ? "שלב 2" : "שלב 3"} — סוג הימור
            </p>
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
        )}

        {/* ── Step 4: Specific bet list ── */}
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

        {/* Placeholder when no location selected yet */}
        {!locationReady && (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-sm">
              {scope === "city" ? "🏙️ בחר עיר כדי להמשיך" : "🗺️ בחר אזור כדי להמשיך"}
            </p>
          </div>
        )}
      </div>

      <BetModal
        bet={selectedBet}
        open={!!selectedBet}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default BuildBet;
