import React, { useEffect, useState, useCallback } from "react";
import { ref, get, query, orderByChild, limitToLast, push } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreateGroupDialog } from "@/components/profile/CreateGroupDialog";
import { JoinGroupDialog } from "@/components/profile/JoinGroupDialog";
import { GroupDetailDialog } from "@/components/profile/GroupDetailDialog";
import { Group } from "@/types";

interface LeaderboardEntry {
  uid: string;
  username: string;
  coins: number;
  avatar_emoji: string;
}

interface LeaderboardData {
  coins: number;
  username: string;
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [tab, setTab] = useState<"profile" | "groups" | "leaderboard">("profile");
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaders(true);
    try {
      // Primary: leaderboard node (populated on login + coin update)
      const snap = await get(ref(db, "leaderboard"));
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data)
          .map(([uid, v]: [string, any]) => {
            const leaderData = v as LeaderboardData;
            return { uid, ...leaderData };
          })
          .sort((a, b) => b.coins - a.coins)
          .slice(0, 50);
        setLeaders(arr);
      } else {
        // Fallback: read directly from users node
        const usersSnap = await get(ref(db, "users"));
        if (usersSnap.exists()) {
          const data = usersSnap.val();
          const arr = Object.entries(data)
            .map(([uid, v]: [string, any]) => ({
              uid,
              username: v.username,
              coins: v.coins,
              avatar_emoji: v.avatar_emoji
            }))
            .sort((a, b) => b.coins - a.coins)
            .slice(0, 50);
          setLeaders(arr);
        }
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
      <div className="border-b border-border px-4 py-4 mb-2">
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
              <div className="border-r border-border h-8 mx-1" />
              <div>
                <p className="text-orange-500 font-black">{profile.consecutive_wins || 0} 🔥</p>
                <p className="text-muted-foreground text-xs">רצף</p>
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
        {/* Feedback Section */}
        <FeedbackSection userId={user?.uid} username={profile?.username} />
      </div>

      <CreateGroupDialog open={showCreate} onOpenChange={setShowCreate} onSuccess={fetchGroups} />
      <JoinGroupDialog open={showJoin} onOpenChange={setShowJoin} onSuccess={fetchGroups} />
      <GroupDetailDialog group={selectedGroup} onClose={() => setSelectedGroup(null)} />
    </div>
  );
};

// ── Feedback Section ────────────────────────────────────────────────────────

const FeedbackSection: React.FC<{ userId?: string; username?: string }> = ({ userId, username }) => {
  const [feedbackType, setFeedbackType] = useState<"bug" | "suggestion" | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || !feedbackType || !userId) return;
    setSubmitting(true);
    try {
      await push(ref(db, "feedback"), {
        type: feedbackType,
        text: text.trim(),
        userId,
        username: username || "אנונימי",
        createdAt: Date.now(),
      });
      toast.success("תודה על הפידבק! 🙏");
      setText("");
      setFeedbackType(null);
    } catch {
      toast.error("משהו השתבש, נסה שוב");
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => { setText(""); setFeedbackType(null); };

  return (
    <>
      <div className="flex gap-2 mt-6 mb-4">
        <Button
          variant="outline"
          className="flex-1 text-xs font-bold"
          onClick={() => setFeedbackType("bug")}
        >
          🐛 דווח על באג
        </Button>
        <Button
          variant="outline"
          className="flex-1 text-xs font-bold"
          onClick={() => setFeedbackType("suggestion")}
        >
          💡 הצע שיפור
        </Button>
      </div>

      <Dialog open={!!feedbackType} onOpenChange={(open) => { if (!open) close(); }}>
        <DialogContent className="bg-card border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-right">
              {feedbackType === "bug" ? "🐛 דווח על באג" : "💡 הצע שיפור"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={feedbackType === "bug" ? "תאר את הבאג שמצאת..." : "מה היית רוצה לשפר?"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="bg-secondary border-border text-foreground min-h-[120px]"
            dir="rtl"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={close} className="text-xs">ביטול</Button>
            <Button onClick={handleSubmit} disabled={!text.trim() || submitting} className="text-xs font-bold">
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  שולח...
                </span>
              ) : "שליחה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Profile;
