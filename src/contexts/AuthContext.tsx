import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, set, update } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { Group } from "@/types";

interface UserProfile {
  username: string;
  coins: number;
  avatar_emoji: string;
  created_at: string;
  wins: number;
  losses: number;
  consecutive_wins: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  needsUsername: boolean;
  setNeedsUsername: (v: boolean) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateCoins: (newCoins: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);

  const fetchProfile = useCallback(async (uid: string) => {
    const snap = await get(ref(db, `users/${uid}`));
    if (snap.exists()) {
      const data = snap.val() as UserProfile;

      // ── Migration: remove any legacy 'email' from DB ──
      if ((data as any).email) {
        await update(ref(db, `users/${uid}`), { email: null });
      }

      // ── Signup bonus: only for brand-new users with no coins yet ──
      const SIGNUP_BONUS = 500_000;
      if (data.coins === undefined || data.coins === null) {
        await set(ref(db, `users/${uid}/coins`), SIGNUP_BONUS);
        data.coins = SIGNUP_BONUS;
      }

      // Always ensure leaderboard entry is up-to-date
      await set(ref(db, `leaderboard/${uid}`), {
        username: data.username,
        coins: data.coins,
        avatar_emoji: data.avatar_emoji,
        consecutive_wins: data.consecutive_wins || 0,
      });
      // ──────────────────────────────────────────────────────────────────

      setProfile(data);
      setNeedsUsername(false);
    } else {
      setNeedsUsername(true);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.uid);
  }, [user, fetchProfile]);

  const updateCoins = useCallback(async (newCoins: number) => {
    if (!user || !profile) return;

    // Update user coins
    await set(ref(db, `users/${user.uid}/coins`), newCoins);
    setProfile((prev) => prev ? { ...prev, coins: newCoins } : prev);

    // Update global leaderboard
    await set(ref(db, `leaderboard/${user.uid}`), {
      username: profile.username,
      coins: newCoins,
      avatar_emoji: profile.avatar_emoji,
    });

    // Sync coins in all groups the user is a member of
    try {
      const groupsSnap = await get(ref(db, "groups"));
      if (groupsSnap.exists()) {
        const groups = groupsSnap.val() as Record<string, Group>;
        const groupUpdates: Record<string, number> = {};
        for (const [groupId, group] of Object.entries(groups)) {
          if (group.members && group.members[user.uid]) {
            groupUpdates[`groups/${groupId}/members/${user.uid}/coins`] = newCoins;
          }
        }
        if (Object.keys(groupUpdates).length > 0) {
          await update(ref(db), groupUpdates);
        }
      }
    } catch (e) {
      // Group sync is best-effort; don't fail the main coin update
      console.warn("Group coin sync failed:", e);
    }
  }, [user, profile]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u.uid);
      } else {
        setProfile(null);
        setNeedsUsername(false);
      }
      setLoading(false);
    });
    return unsub;
  }, [fetchProfile]);

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, needsUsername, setNeedsUsername, logout, refreshProfile, updateCoins }}>
      {children}
    </AuthContext.Provider>
  );
};
