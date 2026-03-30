import React, { createContext, useContext, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthPage from "./pages/AuthPage";
import UsernameModal from "./components/UsernameModal";
import BottomNav from "./components/BottomNav";
import Index from "./pages/Index";
import BuildBet from "./pages/BuildBet";
import MyBets from "./pages/MyBets";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import TopHeader from "./components/CoinBubble";
import { useAlerts } from "./hooks/useAlerts";
import { useBetResolution } from "./hooks/useBetResolution";
import { useDataIngestion } from "./hooks/useDataIngestion";
import { runRegionMigration } from "./utils/migrateRegions";

// ── Theme Context ──────────────────────────────────────────
type Theme = "dark" | "light";

export const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: "dark",
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) || "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
// ──────────────────────────────────────────────────────────

// Inner component so hooks can access AuthContext
const LoggedInShell = () => {
  const { alerts, activeAlerts, todayCount } = useAlerts();
  // Always-on bet resolution — runs on every page, not just Index
  useBetResolution({ alerts, activeAlerts, todayCount });
  useDataIngestion();

  // Run region migration once
  useEffect(() => {
    if (localStorage.getItem("regions_migrated_v3") !== "true") {
      runRegionMigration().then(() => {
        localStorage.setItem("regions_migrated_v3", "true");
      });
    }
  }, []);

  return (
    <>
      <TopHeader />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/build" element={<BuildBet />} />
        <Route path="/my-bets" element={<MyBets />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </>
  );
};

const AppContent = () => {
  const { user, loading, needsUsername } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-primary font-black text-xl animate-pulse">GUESS THE ALARM</p>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  if (needsUsername) return <UsernameModal />;

  return <LoggedInShell />;
};

const App = () => (
  <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
