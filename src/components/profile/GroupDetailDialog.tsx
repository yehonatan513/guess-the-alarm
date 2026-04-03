import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Group } from "@/types";

interface Props {
  group: Group | null;
  onClose: () => void;
}

const formatCoins = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString("he-IL");
};

export const GroupDetailDialog: React.FC<Props> = ({ group, onClose }) => {
  const { user } = useAuth();

  const getGroupMembers = (group: Group) => {
    if (!group.members) return [];
    return Object.entries(group.members)
      .map(([uid, m]) => ({ uid, ...m }))
      .sort((a, b) => b.coins - a.coins);
  };

  return (
    <Dialog open={!!group} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-right">
            👥 {group?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-secondary rounded-lg p-3 text-center">
            <p className="text-muted-foreground text-xs mb-1">קוד הקבוצה (שתף עם חברים)</p>
            <p className="text-primary font-mono font-bold text-sm select-all">{group?.id}</p>
          </div>
          <h3 className="text-foreground font-bold text-sm">🏆 דירוג הקבוצה</h3>
          <div className="bg-secondary/50 rounded-xl overflow-hidden">
            {group && getGroupMembers(group).map((m, i) => (
              <div
                key={m.uid}
                className={`flex items-center justify-between px-4 py-3 border-b border-border last:border-0 ${
                  m.uid === user?.uid ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-bold text-sm w-6">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </span>
                  <span className="text-lg">{m.avatar_emoji}</span>
                  <span className="text-foreground text-sm font-medium">{m.username}</span>
                </div>
                <span className="text-primary font-black text-sm">{formatCoins(m.coins)}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
