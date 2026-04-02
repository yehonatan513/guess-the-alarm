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

// Accept any bet shape that has these 5 fields (works for both BetTemplate and GeneratedBet)
interface BetBase {
  id: string;
  emoji: string;
  title: string;
  description: string;
  multiplier: number;
}

interface Props {
  bet: BetBase | null;
  open: boolean;
  onClose: () => void;
}


const QUICK = [1_000_000, 10_000_000, 50_000_000, 100_000_000];

const formatNum = (n: number) => n.toLocaleString("he-IL");

const BetModal: React.FC<Props> = ({ bet, open, onClose }) => {
  const { user, profile, updateCoins } = useAuth();
  const [amount, setAmount] = useState(0);

  if (!bet) return null;

  const potential = Math.floor(amount * bet.multiplier);
  const canBet = amount > 0 && profile && amount <= profile.coins;

  const handleBet = async () => {
    if (!user || !profile || !canBet) return;

    // Validate amount
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("סכום הימור לא תקין");
      return;
    }

    try {
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
      await updateCoins(profile.coins - amount);
      toast.success("ההימור נרשם! 🎰", { description: `${formatNum(amount)} מטבעות על ${bet.title}` });
      setAmount(0);
      onClose();
    } catch (error) {
      console.error("Failed to place bet:", error);
      toast.error("שגיאה בעת הצבת הימור");
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { setAmount(0); onClose(); }}>
      <DialogContent className="bg-card border-border max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-right">
            <span className="text-2xl ml-2">{bet.emoji}</span>
            {bet.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm text-right">{bet.description}</p>
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
                className="px-3 py-1.5 bg-secondary rounded-lg text-xs text-foreground font-bold hover:bg-primary/20 transition-colors"
              >
                {q >= 1_000_000 ? `${q / 1_000_000}M` : formatNum(q)}
              </button>
            ))}
            <button
              onClick={() => profile && setAmount(profile.coins)}
              className="px-3 py-1.5 bg-destructive/20 rounded-lg text-xs text-destructive font-bold hover:bg-destructive/30 transition-colors"
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
            המר! 🎯
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BetModal;
