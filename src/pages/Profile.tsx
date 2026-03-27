import React, { useEffect, useState } from "react";
import { ref, get, query, orderByChild, limitToLast } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface LeaderboardEntry {
  uid: string;
  username: string;
  coins: number;
  avatar_emoji: string;
}

const formatCoins = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString("he-IL");
};

const Profile = () => {
  const { user, profile, logout } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const snap = await get(query(ref(db, "leaderboard"), orderByChild("coins"), limitToLast(20)));
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data)
          .map(([uid, v]: any) => ({ uid, ...v }))
          .sort((a, b) => b.coins - a.coins);
        setLeaders(arr);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
        <h1 className="text-primary font-black text-lg text-center">👤 פרופיל</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6 mt-4">
        {/* User card */}
        {profile && (
          <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3">
            <span className="text-5xl">{profile.avatar_emoji}</span>
            <h2 className="text-foreground font-bold text-xl">{profile.username}</h2>
            <p className="text-primary font-black text-2xl">🪙 {formatCoins(profile.coins)}</p>
            <div className="flex justify-center gap-6 text-sm">
              <div>
                <p className="text-primary font-bold">{profile.wins}</p>
                <p className="text-muted-foreground text-xs">ניצחונות</p>
              </div>
              <div>
                <p className="text-destructive font-bold">{profile.losses}</p>
                <p className="text-muted-foreground text-xs">הפסדים</p>
              </div>
            </div>
            <button onClick={logout} className="text-xs text-muted-foreground underline mt-2">
              התנתק
            </button>
          </div>
        )}

        {/* Leaderboard */}
        <div className="space-y-3">
          <h2 className="text-foreground font-bold text-sm">🏆 לידרבורד</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {leaders.map((entry, i) => (
              <div
                key={entry.uid}
                className={`flex items-center justify-between px-4 py-3 border-b border-border last:border-0 ${
                  entry.uid === user?.uid ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-bold text-sm w-6">{i + 1}</span>
                  <span className="text-lg">{entry.avatar_emoji}</span>
                  <span className="text-foreground text-sm font-medium">{entry.username}</span>
                </div>
                <span className="text-primary font-black text-sm">{formatCoins(entry.coins)}</span>
              </div>
            ))}
            {leaders.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-6">טוען...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
