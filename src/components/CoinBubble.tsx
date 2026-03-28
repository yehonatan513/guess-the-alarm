import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const formatCoins = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B 🪙`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M 🪙`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K 🪙`;
  return `${n.toLocaleString("he-IL")} 🪙`;
};

const CoinBubble: React.FC = () => {
  const { profile } = useAuth();
  const [visible, setVisible] = useState(true);
  const [shake, setShake] = useState(false);
  const prevCoins = useRef<number | null>(null);

  // Shake animation when coins change
  useEffect(() => {
    if (prevCoins.current !== null && profile && profile.coins !== prevCoins.current) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
    if (profile) prevCoins.current = profile.coins;
  }, [profile?.coins]);

  if (!profile) return null;

  return (
    <div
      className={`fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8 pointer-events-none"
      }`}
    >
      <button
        onClick={() => setVisible(v => !v)}
        className={`
          flex items-center gap-1.5 px-4 py-1.5 rounded-full
          bg-background/80 backdrop-blur-md
          border border-primary/30
          shadow-lg shadow-primary/20
          text-primary font-black text-sm
          transition-all duration-200
          hover:border-primary/60 hover:shadow-primary/30
          active:scale-95
          ${shake ? "animate-wiggle" : ""}
        `}
        title="לחץ להסתרה"
      >
        <span className="text-base">🪙</span>
        <span className="tabular-nums">{formatCoins(profile.coins)}</span>
      </button>
    </div>
  );
};

export default CoinBubble;
