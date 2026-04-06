import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/App";
import { toast } from "sonner";

const formatCoins = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString("he-IL");
};

const TopHeader: React.FC = () => {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [shake, setShake] = useState(false);
  const prevCoins = useRef<number | null>(null);

  useEffect(() => {
    if (prevCoins.current !== null && profile && profile.coins !== prevCoins.current) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
    if (profile) prevCoins.current = profile.coins;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.coins]); // Only depend on coins changing, profile is handled internally to avoid re-renders when other profile fields change

  if (!profile) return null;

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
      <div className="flex justify-between items-center max-w-lg mx-auto">
        
        {/* Left: Coins */}
        <div className={`flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 ${shake ? "animate-wiggle" : ""}`}>
          <span className="text-xl" aria-hidden="true">🪙</span>
          <span className="text-primary font-black text-lg">{formatCoins(profile.coins)}</span>
        </div>

        {/* Center: Title */}
        <h1 className="text-primary font-black text-sm tracking-widest mx-2 truncate">
          GUESS THE ALARM
        </h1>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={async () => {
              const shareData = {
                title: "Guess The Alarm 🚀",
                text: "בוא להמר על אזעקות! 🎰🚨",
                url: window.location.origin,
              };
              try {
                if (navigator.share) {
                  await navigator.share(shareData);
                } else {
                  await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                  toast.success("הקישור הועתק! 📋");
                }
              } catch { /* user cancelled share */ }
            }}
            className="text-lg w-9 h-9 flex items-center justify-center rounded-lg bg-secondary hover:bg-secondary/70 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="שתף"
            aria-label="שתף"
          >
            <span aria-hidden="true">🔗</span>
          </button>
          <button
            onClick={toggleTheme}
            className="text-lg w-9 h-9 flex items-center justify-center rounded-lg bg-secondary hover:bg-secondary/70 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="שינוי נושא"
            aria-label="שינוי נושא"
          >
            <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
          </button>
        </div>
      </div>
      
      {/* Sub-row for user name / logout */}
      <div className="flex justify-between items-center max-w-lg mx-auto mt-2 px-1">
        <span className="text-muted-foreground text-xs font-bold">
          {profile.avatar_emoji} {profile.username}
        </span>
        <button onClick={logout} className="text-xs text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">
          יציאה
        </button>
      </div>
    </div>
  );
};

export default TopHeader;
