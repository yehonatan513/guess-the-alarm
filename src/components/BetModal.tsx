import { FirebaseBet } from "../types";
import React, { useState } from "react";
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

// Minimum and maximum allowed bet amounts
const MIN_BET = 1;
const MAX_BET = 1_000_000_000;

const formatNum = (n: number) => n.toLocaleString("he-IL");

/**
 * Sanitise and clamp a raw numeric input value.
 * Returns null if the value is not a valid positive integer.
 */
const parseAmount = (raw: string | number, maxCoins: number): number | null => {
  const n = typeof raw === "string" ? parseInt(raw, 10) : Math.floor(raw);
  if (!Number.isFinite(n) || n < MIN_BET) return null;
  // Clamp to the user's actual balance and the global ceiling
  return Math.min(n, maxCoins, MAX_BET);
};

const BetModal: React.FC<Props> = ({ bet, open, onClose }) => {
  const { user, profile, updateCoins } = useAuth();
  const [amount, setAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!bet) return null;

  const potential = Math.floor(amount * bet.multiplier);

  // canBet is derived entirely from server-authoritative profile data
  const canBet =
    amount > 0 &&
    profile !== null &&
    profile !== undefined &&
    Number.isInteger(amount) &&
    amount >= MIN_BET &&
    amount <= profile.coins &&
    !isSubmitting;

  /** Safely update the amount, always clamping to the user's real balance */
  const safeSetAmount = (raw: number | string) => {
    if (!profile) return;
    const clamped = parseAmount(raw, profile.coins);
    setAmount(clamped ?? 0);
  };

  const handleBet = async () => {
    // Guard: prevent double-submission even if the button is somehow triggered
    if (isSubmitting) return;
    if (!user || !profile) return;

    // Re-validate amount server-side before touching the database
    const safeAmount = parseAmount(amount, profile.coins);
    if (safeAmount === null || safeAmount <= 0) {
      toast.error("סכום הימור לא תקין");
      return;
    }

    // Authoritative balance check (profile comes from the auth context / DB)
    if (safeAmount > profile.coins) {
      toast.error("אין לך מספיק מטבעות להימור זה");
      return;
    }

    // Duplicate check: Same user, same bet id, placed in last 60 minutes
    try {
      setIsSubmitting(true);
      const recentQuery = query(
        ref(db, "bets"),
        orderByChild("uid"),
        equalTo(user.uid)
      );
      const snap = await get(recentQuery);
      if (snap.exists()) {
        const bets = snap.val() as Record<string, FirebaseBet>;
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const isDuplicate = Object.values(bets).some(
          (b: FirebaseBet) =>
            b.type === bet.id &&
            b.status === "open" &&
            new Date(b.created_at).getTime() > oneHourAgo
        );
        if (isDuplicate) {
          toast.error("כבר הצבת הימור זהה בשעה האחרונה");
          setIsSubmitting(false);
          return;
        }
      }
    } catch (e) {
      // If the duplicate check fails we abort rather than proceeding blindly
      console.error("Duplicate check failed, aborting bet submission", e);
      toast.error("שגיאה בבדיקת כפילות הימור, נסה שוב");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Deduct coins first to prevent double-spend
      await updateCoins(profile.coins - safeAmount);

      // 2. Only then record the bet in the DB
      await push(ref(db, "bets"), {
        uid: user.uid,
        username: profile.username,
        type: bet.id,
        description: bet.title,
        area: "",
        amount: safeAmount,
        multiplier: bet.multiplier,
        status: "open",
        coins_won: 0,
        created_at: new Date().toISOString(),
        resolved_at: null,
      });

      toast.success("ההימור נרשם! 🎰", {
        description: `${formatNum(safeAmount)} מטבעות על ${bet.title}`,
      });
      setAmount(0);
      onClose();
    } catch (error) {
      console.error("Failed to place bet:", error);
      toast.error("שגיאה בעת הצבת הימור");
    } finally {
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
            min={MIN_BET}
            max={profile?.coins ?? MAX_BET}
            onChange={(e) => safeSetAmount(e.target.value)}
            className="bg-secondary border-border text-foreground text-center text-lg"
            dir="ltr"
          />
          <div className="flex gap-2 flex-wrap justify-center">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => safeSetAmount(q)}
                className="px-3 py-1.5 bg-secondary rounded-lg text-xs text-foreground font-bold hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {q >= 1_000_000 ? `${q / 1_000_000}M` : formatNum(q)}
              </button>
            ))}
            <button
              onClick={() => profile && safeSetAmount(profile.coins)}
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
            aria-disabled={!canBet}
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
