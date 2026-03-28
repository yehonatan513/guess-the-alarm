import React, { useEffect, useState, useCallback } from "react";
import { ref, get, push, set, query, orderByChild, limitToLast } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LeaderboardEntry {
  uid: string;
  username: string;
  coins: number;
  avatar_emoji: string;
}

interface Group {
  id: string;
  name: string;
  created_by: string;
  members: Record<string, { username: string; avatar_emoji: string; coins: number }>;
}

const formatCoins = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString("he-IL");
};

const Profile = () => {
  const { user, profile, logout } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [tab, setTab] = useState<"profile" | "groups" | "leaderboard">("profile");
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaders(true);
    try {
      const snap = await get(query(ref(db, "leaderboard"), orderByChild("coins"), limitToLast(20)));
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data)
          .map(([uid, v]: any) => ({ uid, ...v }))
          .sort((a, b) => b.coins - a.coins);
        setLeaders(arr);
      }
    } finally {
      setLoadingLeaders(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      const snap = await get(ref(db, "groups"));
      if (snap.exists()) {
        const data = snap.val();
        const arr: Group[] = Object.entries(data)
          .map(([id, v]: any) => ({ id, ...v }))
          .filter((g: Group) => g.members && g.members[user.uid]);
        setGroups(arr);
      } else {
        setGroups([]);
      }
    } finally {
      setLoadingGroups(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLeaderboard();
    fetchGroups();
  }, [fetchLeaderboard, fetchGroups]);

  const handleCreateGroup = async () => {
    if (!user || !profile || !newGroupName.trim()) return;
    const newRef = push(ref(db, "groups"));
    await set(newRef, {
      name: newGroupName.trim(),
      created_by: user.uid,
      members: {
        [user.uid]: {
          username: profile.username,
          avatar_emoji: profile.avatar_emoji,
          coins: profile.coins,
        },
      },
    });
    setNewGroupName("");
    setShowCreate(false);
    fetchGroups();
  };

  const handleJoinGroup = async () => {
    if (!user || !profile || !joinCode.trim()) return;
    const snap = await get(ref(db, `groups/${joinCode.trim()}`));
    if (snap.exists()) {
      await set(ref(db, `groups/${joinCode.trim()}/members/${user.uid}`), {
        username: profile.username,
        avatar_emoji: profile.avatar_emoji,
        coins: profile.coins,
      });
      setJoinCode("");
      setShowJoin(false);
      fetchGroups();
    }
  };

  const getGroupMembers = (group: Group) => {
    if (!group.members) return [];
    return Object.entries(group.members)
      .map(([uid, m]) => ({ uid, ...m }))
      .sort((a, b) => b.coins - a.coins);
  };

  const Spinner = () => (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
        <h1 className="text-primary font-black text-lg text-center">👤 פרופיל</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-3">
        {/* Tabs */}
        <div className="flex bg-card rounded-lg p-1 border border-border mb-4">
          {(["profile", "groups", "leaderboard"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-all duration-200 ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t === "profile" ? "פרופיל" : t === "groups" ? "קבוצות" : "לידרבורד"}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === "profile" && profile && (
          <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3 animate-fadeIn">
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

        {/* Groups Tab */}
        {tab === "groups" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex gap-2">
              <Button onClick={() => setShowCreate(true)} className="flex-1 text-xs font-bold">
                ➕ צור קבוצה
              </Button>
              <Button onClick={() => setShowJoin(true)} variant="outline" className="flex-1 text-xs font-bold">
                🔗 הצטרף לקבוצה
              </Button>
            </div>

            {loadingGroups ? (
              <Spinner />
            ) : groups.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <p className="text-muted-foreground text-sm">אין קבוצות עדיין 👥</p>
                <p className="text-muted-foreground text-xs mt-1">צור קבוצה חדשה או הצטרף לקיימת</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className="w-full bg-card border border-border rounded-xl p-4 text-right hover:border-primary/50 transition-all duration-200"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">
                        {group.members ? Object.keys(group.members).length : 0} חברים
                      </span>
                      <h3 className="text-foreground font-bold text-sm">👥 {group.name}</h3>
                    </div>
                    <div className="flex gap-1 mt-2 justify-end">
                      {getGroupMembers(group).slice(0, 5).map((m) => (
                        <span key={m.uid} className="text-sm">{m.avatar_emoji}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {tab === "leaderboard" && (
          <div className="space-y-3 animate-fadeIn">
            <h2 className="text-foreground font-bold text-sm">🏆 לידרבורד גלובלי</h2>
            {loadingLeaders ? (
              <Spinner />
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {leaders.map((entry, i) => (
                  <div
                    key={entry.uid}
                    className={`flex items-center justify-between px-4 py-3 border-b border-border last:border-0 ${
                      entry.uid === user?.uid ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-bold text-sm w-6">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </span>
                      <span className="text-lg">{entry.avatar_emoji}</span>
                      <span className="text-foreground text-sm font-medium">{entry.username}</span>
                    </div>
                    <span className="text-primary font-black text-sm">{formatCoins(entry.coins)}</span>
                  </div>
                ))}
                {leaders.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-6">אין נתונים עדיין</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-right">➕ צור קבוצה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="שם הקבוצה..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="bg-secondary border-border text-foreground text-right"
            />
            <Button onClick={handleCreateGroup} className="w-full font-bold" disabled={!newGroupName.trim()}>
              צור קבוצה
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-right">🔗 הצטרף לקבוצה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="קוד קבוצה..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="bg-secondary border-border text-foreground text-right"
              dir="ltr"
            />
            <p className="text-muted-foreground text-xs">קבל את קוד הקבוצה ממנהל הקבוצה</p>
            <Button onClick={handleJoinGroup} className="w-full font-bold" disabled={!joinCode.trim()}>
              הצטרף
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Detail Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-right">
              👥 {selectedGroup?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs mb-1">קוד הקבוצה (שתף עם חברים)</p>
              <p className="text-primary font-mono font-bold text-sm select-all">{selectedGroup?.id}</p>
            </div>
            <h3 className="text-foreground font-bold text-sm">🏆 דירוג הקבוצה</h3>
            <div className="bg-secondary/50 rounded-xl overflow-hidden">
              {selectedGroup && getGroupMembers(selectedGroup).map((m, i) => (
                <div
                  key={m.uid}
                  className={`flex items-center justify-between px-4 py-3 border-b border-border last:border-0 ${
                    m.uid === user?.uid ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-bold text-sm w-6">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </span>
                    <span className="text-lg">{m.avatar_emoji}</span>
                    <span className="text-foreground text-sm font-medium">{m.username}</span>
                  </div>
                  <span className="text-primary font-black text-sm">{formatCoins(m.coins)}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
