import React, { useState } from "react";

const SCOPES = ["עיר", "אזור", "כללי"] as const;
const BET_TYPES = [
  { emoji: "📊", title: "כמה סה\"כ", desc: "כמה אזעקות סה\"כ?" },
  { emoji: "📈", title: "אובר/אנדר", desc: "כמה אזעקות יהיו?" },
  { emoji: "🕊️", title: "תקופת שקט", desc: "כמה זמן עד האזעקה הבאה?" },
  { emoji: "🌙", title: "אזעקת לילה", desc: "האם תהיה אזעקה הלילה? (00:00-06:00)" },
];

const BuildBet = () => {
  const [scope, setScope] = useState<typeof SCOPES[number]>("כללי");

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
                className={`flex-1 py-2 rounded-md text-xs font-bold transition-colors ${
                  scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Bet types */}
        <div className="space-y-2">
          <h2 className="text-foreground font-bold text-sm">סוג הימור</h2>
          <div className="grid grid-cols-2 gap-3">
            {BET_TYPES.map((bt) => (
              <button
                key={bt.title}
                className="bg-card border border-border rounded-xl p-4 text-right hover:border-primary/50 transition-all active:scale-95 space-y-2"
              >
                <span className="text-2xl">{bt.emoji}</span>
                <p className="text-foreground text-sm font-bold">{bt.title}</p>
                <p className="text-muted-foreground text-xs">{bt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Placeholder for custom bet building */}
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-muted-foreground text-sm">בחר סוג הימור כדי להתחיל 🎲</p>
        </div>
      </div>
    </div>
  );
};

export default BuildBet;
