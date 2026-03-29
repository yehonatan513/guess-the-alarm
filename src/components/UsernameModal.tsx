import React, { useState, useEffect } from "react";
import { ref, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMOJIS = ["😎", "🔥", "💀", "👑", "🎯", "🚀", "⚡", "🦁"];

const UsernameModal = () => {
  const { user, setNeedsUsername, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [emoji, setEmoji] = useState("😎");

  useEffect(() => {
    if (user?.email) {
      // Extract username from dummy email: "nick@domain.com" -> "nick"
      const name = user.email.split("@")[0];
      setUsername(name);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user || !username.trim()) return;
    const profile = {
      username: username.trim(),
      coins: 500_000,
      avatar_emoji: emoji,
      created_at: new Date().toISOString(),
      wins: 0,
      losses: 0,
    };
    
    // Save to users node
    await set(ref(db, `users/${user.uid}`), profile);
    
    // Save to leaderboard
    await set(ref(db, `leaderboard/${user.uid}`), {
      username: profile.username,
      coins: profile.coins,
      avatar_emoji: emoji,
    });

    await refreshProfile();
    setNeedsUsername(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-card p-6 border border-border animate-slideInUp">
        <h2 className="text-xl font-bold text-primary text-center">הושלם! כמעט שם...</h2>
        
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground mr-1">שם המשתמש שלך:</p>
          <Input
            value={username}
            readOnly
            className="bg-secondary/50 border-border text-foreground text-right font-bold opacity-70 cursor-not-allowed"
          />
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">בחר אווטאר:</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`text-2xl p-2 rounded-lg transition-all ${
                  emoji === e ? "bg-primary/20 ring-2 ring-primary scale-110" : "bg-secondary scale-100"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        
        <Button onClick={handleSave} className="w-full font-bold text-lg" disabled={!username.trim()}>
          🎮 התחל לשחק!
        </Button>
        <p className="text-xs text-muted-foreground text-center">תקבל 500,000 מטבעות להתחלה!</p>
      </div>
    </div>
  );
};

export default UsernameModal;
