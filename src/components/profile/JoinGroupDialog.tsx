import React, { useState } from "react";
import { get, ref, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const JoinGroupDialog: React.FC<Props> = ({ open, onOpenChange, onSuccess }) => {
  const { user, profile } = useAuth();
  const [joinCode, setJoinCode] = useState("");

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
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  );
};
