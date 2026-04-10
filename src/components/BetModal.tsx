import { FirebaseBet } from "../types";
import React, { useState, useCallback, useRef } from "react";
import { ref, push, runTransaction } from "firebase/database";
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

const formatNum = (n: number) => n.toLocaleString("he-IL");

// ⚡ Bolt Optimization: Memoize BetModal to prevent unnecessary re-renders
// when parent components (like Index or BuildBet) update frequently
// due to real-time countdowns or active input fields (like city search).
const BetModal: React.FC<Props> = ({ bet, open, onClose }) => {
  const { user, profile, updateCoins } = useAuth();
  const [amount, setAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Use a ref to prevent double-submission even across async gaps
  const submittingRef = useRef(false);

  const handleCloseModal = useCallback(() => {
    setAmount(0);
    onClose();
  }, [onClose]);

  if (!bet) return null;

  const potential = Math.floor(amount * bet.multiplier);
  const canBet = amount > 0 && profile && !isSubmitting;

  const handleBet = async () => {
    // Guard against double-submission using both state and ref
    if (submittingRef.current || isSubmitting) return;

    // Re-read auth state at call time to avoid stale closure issues
    if (!user || !profile) {
      toast.error("יש להתחבר כדי להמר");
      return;
    }

    // Validate amount
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("סכום הימור לא תקין");
      return;
    }

    if (amount > profile.coins) {
      toast.error("אין לך מספיק מטבעות להימור זה");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    // Duplicate check: Same user, same bet id, placed in last 60 minutes
    try {
      const recentQuery = query(ref(db, "bets"), orderByChild("uid"), equalTo(user.uid));
      const snap = await get(recentQuery);
      if (snap.exists()) {
        const bets = snap.val();
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const isDuplicate = Object.values(bets).some((b: FirebaseBet) =>
          b.type === bet.id &&
          b.status === "open" &&
          new Date(b.created_at).getTime() > oneHourAgo
        );
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
      // Capture uid and username at submission time to avoid acting on behalf of wrong user
      const submittingUid = user.uid;
      const submittingUsername = profile.username;
      const submittingCoins = profile.coins;

      // Sanity check: ensure the uid hasn't changed between render and submission
      if (!submittingUid || !submittingUsername) {
        toast.error("שגיאת אימות, נסה שוב");
        return;
      }

      // Use a transaction to atomically deduct coins and push the bet,
      // preventing race conditions where two concurrent submissions
      // could both read the same coin balance.
      let betKey: string | null = null;

      // 1. Deduct coins atomically via transaction
      const coinsRef = ref(db, `users/${submittingUid}/coins`);
      const txResult = await runTransaction(coinsRef, (currentCoins: number | null) => {
        const coins = currentCoins ?? submittingCoins;
        if (coins < amount) {
          // Abort transaction
          return undefined;
        }
        return coins - amount;
      });

      if (!txResult.committed) {
        toast.error("אין לך מספיק מטבעות להימור זה");
        return;
      }

      // 2. Push bet to DB after coins are deducted
      try {
        const newBetRef = await push(ref(db, "bets"), {
          uid: submittingUid,
          username: submittingUsername,
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
        betKey = newBetRef.key;
      } catch (pushError) {
        // Bet push failed — refund coins via transaction
        console.error("Bet push failed, refunding coins", pushError);
        await runTransaction(coinsRef, (currentCoins: number | null) => {
          return (currentCoins ?? 0) + amount;
        });
        throw pushError;
      }

      // 3. Sync local coin state with the committed value
      await updateCoins(submittingCoins - amount);

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
    <Dialog open={open} onOpenChange={handleCloseModal}>
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
            onChange={(e) => setAmount(Number(e.target.value))}
            className="bg-secondary border-border text-foreground text-center text-lg"
            dir="ltr"
          />
          <div className="flex gap-2 flex-wrap justify-center">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => setAmount(q)}
                className="px-3 py-1.5 bg-secondary rounded-lg text-xs text-foreground font-bold hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {q >= 1_000_000 ? `${q / 1_000_000}M` : formatNum(q)}
              </button>
            ))}
            <button
              onClick={() => profile && setAmount(profile.coins)}
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
