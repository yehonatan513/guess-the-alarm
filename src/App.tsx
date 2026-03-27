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

  return (
    <>
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

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
