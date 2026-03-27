import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { auth, db } from "@/lib/firebase";

interface UserProfile {
  username: string;
  coins: number;
  avatar_emoji: string;
  created_at: string;
  wins: number;
  losses: number;
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

  const fetchProfile = async (uid: string) => {
    const snap = await get(ref(db, `users/${uid}`));
    if (snap.exists()) {
      setProfile(snap.val());
      setNeedsUsername(false);
    } else {
      setNeedsUsername(true);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  const updateCoins = async (newCoins: number) => {
    if (!user || !profile) return;
    await set(ref(db, `users/${user.uid}/coins`), newCoins);
    setProfile({ ...profile, coins: newCoins });
    await set(ref(db, `leaderboard/${user.uid}`), {
      username: profile.username,
      coins: newCoins,
      avatar_emoji: profile.avatar_emoji,
    });
  };

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
  }, []);

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
