import React, { useState } from "react";
import { push, ref, set } from "firebase/database";
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

export const CreateGroupDialog: React.FC<Props> = ({ open, onOpenChange, onSuccess }) => {
  const { user, profile } = useAuth();
  const [newGroupName, setNewGroupName] = useState("");

  const handleCreateGroup = async () => {
    if (!user || !profile || !newGroupName.trim()) return;
    const newRef = push(ref(db, "groups"));
    await set(newRef, {
      name: newGroupName.trim(),
      created_by: user.uid,
      members: {
        [user.uid]: {
          username: profile.username,
          avatar_emoji: profile.avatar_emoji,
          coins: profile.coins,
        },
      },
    });
    setNewGroupName("");
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-right">➕ צור קבוצה חדשה</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="שם הקבוצה..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="bg-secondary border-border text-foreground text-right"
          />
          <Button onClick={handleCreateGroup} className="w-full font-bold" disabled={!newGroupName.trim()}>
            צור קבוצה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
