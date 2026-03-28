import React, { useState } from "react";
import { BETS, BetTemplate } from "@/lib/bets-data";
import BetModal from "@/components/BetModal";

const SCOPES = ["עיר", "אזור", "כללי"] as const;

// Map bet categories to display groups shown on BuildBet
const BUILD_GROUPS = [
  {
    emoji: "📊",
    title: "כמה סה\"כ",
    desc: "כמה אזעקות סה\"כ היום?",
    filter: (b: BetTemplate) =>
      b.id === "b2" || b.id === "b25" || b.id === "b26" || b.id === "b24" || b.id === "b23",
  },
  {
    emoji: "📈",
    title: "אובר/אנדר",
    desc: "מעל/מתחת לסף מסוים באזור",
    filter: (b: BetTemplate) =>
      (b.category === "common" && (b.id === "b3" || b.id === "b5" || b.id === "b15")) ||
      b.id === "b20" || b.id === "b21" || b.id === "b22" || b.id === "b18" || b.id === "b13",
  },
  {
    emoji: "🕊️",
    title: "תקופת שקט",
    desc: "כמה זמן עד האזעקה הבאה?",
    filter: (b: BetTemplate) => b.id === "b4" || b.id === "b16" || b.id === "b11",
  },
  {
    emoji: "🌙",
    title: "אזעקת לילה",
    desc: "האם תהיה אזעקה הלילה? (00:00-06:00)",
    filter: (b: BetTemplate) =>
      b.id === "b1" || b.id === "b6" || b.id === "b9" || b.id === "b12" || b.id === "b17",
  },
];

const BuildBet = () => {
  const [scope, setScope] = useState<typeof SCOPES[number]>("כללי");
  const [selectedBet, setSelectedBet] = useState<BetTemplate | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  const groupBets = selectedGroup !== null
    ? BETS.filter(BUILD_GROUPS[selectedGroup].filter)
    : [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
        <h1 className="text-primary font-black text-lg text-center">🎰 בנה הימור</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6 mt-4">
        {/* Scope */}
        <div className="space-y-2">
          <h2 className="text-foreground font-bold text-sm">טווח ההימור</h2>
          <div className="flex bg-card rounded-lg p-1 border border-border">
            {SCOPES.map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`flex-1 py-2 rounded-md text-xs font-bold transition-all duration-200 ${
                  scope === s ? "bg-primary text-primary-foreground scale-105" : "text-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Bet type groups */}
        <div className="space-y-2">
          <h2 className="text-foreground font-bold text-sm">סוג הימור</h2>
          <div className="grid grid-cols-2 gap-3">
            {BUILD_GROUPS.map((group, idx) => (
              <button
                key={group.title}
                onClick={() => setSelectedGroup(selectedGroup === idx ? null : idx)}
                className={`border rounded-xl p-4 text-right transition-all duration-200 active:scale-95 space-y-2 ${
                  selectedGroup === idx
                    ? "bg-primary/10 border-primary shadow-lg shadow-primary/10"
                    : "bg-card border-border hover:border-primary/50"
                }`}
              >
                <span className="text-2xl">{group.emoji}</span>
                <p className="text-foreground text-sm font-bold">{group.title}</p>
                <p className="text-muted-foreground text-xs">{group.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Expanded bet list for the selected group */}
        {selectedGroup !== null && groupBets.length > 0 && (
          <div className="space-y-2 animate-fadeIn">
            <h2 className="text-foreground font-bold text-sm">בחר הימור ספציפי</h2>
            <div className="grid grid-cols-1 gap-2">
              {groupBets.map((bet) => (
                <button
                  key={bet.id}
                  onClick={() => setSelectedBet(bet)}
                  className="bg-card border border-border rounded-xl p-4 text-right hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 active:scale-98 flex items-center justify-between"
                >
                  <span className="inline-block bg-primary/15 text-primary font-black text-sm px-2 py-0.5 rounded-md">
                    x{bet.multiplier}
                  </span>
                  <div className="text-right">
                    <p className="text-foreground text-sm font-bold">
                      {bet.emoji} {bet.title}
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">{bet.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedGroup === null && (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-sm">בחר סוג הימור כדי להתחיל 🎲</p>
          </div>
        )}
      </div>

      <BetModal bet={selectedBet} open={!!selectedBet} onClose={() => setSelectedBet(null)} />
    </div>
  );
};

export default BuildBet;
