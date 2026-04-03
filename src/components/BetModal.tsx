import { FirebaseBet } from "../types";
import React, { useState, useRef } from "react";
import { ref, push } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { query, orderByChild, equalTo, get } from "firebase/database";
import { Badge } from "@/components/ui/badge";

// Accept any bet shape that has these 5 fields (works for both BetTemplate and GeneratedBet)
interface BetBase {
  id: string;
  emoji: string;
  title: string;
  description: string;
  multiplier: number;
  riskLevel?: "נמוך" | "בינוני" | "גבוה";
  oddsExplanation?: string;
}

interface Props {
  bet: BetBase | null;
  open: boolean;
  onClose: () => void;
}

const QUICK = [1_000_000, 10_000_000, 50_000_000, 100_000_000];
const MAX_BET_AMOUNT = 1_000_000_000; // 1 billion coins hard cap

const formatNum = (n: number) => n.toLocaleString("he-IL");

const BetModal: React.FC<Props> = ({ bet, open, onClose }) => {
  const { user, profile, updateCoins } = useAuth();
  const [amount, setAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Ref-based guard to prevent race conditions where state update hasn't propagated yet
  const submittingRef = useRef(false);

  if (!bet) return null;

  const potential = Math.floor(amount * bet.multiplier);

  // Validate amount server-side-style: must be a positive integer within user's balance
  const isValidAmount =
    Number.isInteger(amount) &&
    amount > 0 &&
    amount <= MAX_BET_AMOUNT &&
    profile != null &&
    amount <= profile.coins;

  const canBet = isValidAmount && profile && !isSubmitting;

  const sanitizeAmount = (raw: number): number => {
    // Clamp to integer, non-negative, within hard cap
    const floored = Math.floor(raw);
    if (!isFinite(floored) || floored < 0) return 0;
    return Math.min(floored, MAX_BET_AMOUNT);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    setAmount(sanitizeAmount(raw));
  };

  const handleQuickAmount = (q: number) => {
    setAmount(sanitizeAmount(q));
  };

  const handleMaxAmount = () => {
    if (profile) {
      setAmount(sanitizeAmount(profile.coins));
    }
  };

  const handleBet = async () => {
    // Double-guard: use both ref (synchronous) and state to prevent race conditions
    if (submittingRef.current || isSubmitting) return;
    if (!user || !profile) return;

    // Re-validate amount at submission time (guards against any client-side bypass)
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("סכום הימור לא תקין");
      return;
    }

    if (amount > MAX_BET_AMOUNT) {
      toast.error("סכום הימור חורג מהמקסימום המותר");
      return;
    }

    if (amount > profile.coins) {
      toast.error("אין לך מספיק מטבעות להימור זה");
      return;
    }

    // Atomically set both guards before any async work
    submittingRef.current = true;
    setIsSubmitting(true);

    // Duplicate check: Same user, same bet id, placed in last 60 minutes
    try {
      const recentQuery = query(ref(db, "bets"), orderByChild("uid"), equalTo(user.uid));
      const snap = await get(recentQuery);
      if (snap.exists()) {
        const bets = snap.val();
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const isDuplicate = Object.values(bets).some((b: unknown) => {
          const fb = b as FirebaseBet;
          return (
            fb.type === bet.id &&
            fb.status === "open" &&
            new Date(fb.created_at).getTime() > oneHourAgo
          );
        });
        if (isDuplicate) {
          toast.error("כבר הצבת הימור זהה בשעה האחרונה");
          submittingRef.current = false;
          setIsSubmitting(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Duplicate check failed, proceeding anyway", e);
    }

    try {
      // 1. Push bet to DB first
      await push(ref(db, "bets"), {
        uid: user.uid,
        username: profile.username,
        type: bet.id,
        description: bet.title,
        area: "",
        amount,
        multiplier: bet.multiplier,
        status: "open",
        coins_won: 0,
        created_at: new Date().toISOString(),
        resolved_at: null,
      });

      // 2. Only then deduct coins
      await updateCoins(profile.coins - amount);

      toast.success("ההימור נרשם! 🎰", { description: `${formatNum(amount)} מטבעות על ${bet.title}` });
      setAmount(0);
      onClose();
    } catch (error) {
      console.error("Failed to place bet:", error);
      toast.error("שגיאה בעת הצבת הימור");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { setAmount(0); onClose(); }}>
      <DialogContent className="bg-card border-border max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-right">
            <span className="text-2xl ml-2" aria-hidden="true">{bet.emoji}</span>
            {bet.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm text-right">{bet.description}</p>

        {bet.riskLevel && (
          <div className="flex justify-between items-center bg-secondary/30 p-2 rounded-lg text-xs">
            <Badge variant={bet.riskLevel === "גבוה" ? "destructive" : "secondary"} className="font-bold">
              סיכון {bet.riskLevel}
            </Badge>
            <span className="text-muted-foreground">{bet.oddsExplanation}</span>
          </div>
        )}

        <div className="text-primary font-black text-2xl text-center">x{bet.multiplier}</div>

        <div className="space-y-3">
          <Input
            type="number"
            placeholder="כמה מטבעות?"
            value={amount || ""}
            onChange={handleAmountChange}
            min={1}
            max={profile ? Math.min(profile.coins, MAX_BET_AMOUNT) : MAX_BET_AMOUNT}
            step={1}
            className="bg-secondary border-border text-foreground text-center text-lg"
            dir="ltr"
          />
          <div className="flex gap-2 flex-wrap justify-center">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => handleQuickAmount(q)}
                className="px-3 py-1.5 bg-secondary rounded-lg text-xs text-foreground font-bold hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {q >= 1_000_000 ? `${q / 1_000_000}M` : formatNum(q)}
              </button>
            ))}
            <button
              onClick={handleMaxAmount}
              className="px-3 py-1.5 bg-destructive/20 rounded-lg text-xs text-destructive font-bold hover:bg-destructive/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              MAX
            </button>
          </div>

          {amount > 0 && (
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">רווח פוטנציאלי</p>
              <p className="text-primary font-black text-xl">{formatNum(potential)} 🪙</p>
            </div>
          )}

          <Button
            onClick={handleBet}
            disabled={!canBet}
            className="w-full font-bold text-lg h-12"
          >
            {isSubmitting ? <span className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "המר! 🎯"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BetModal;
