export interface GroupMember {
  username: string;
  avatar_emoji: string;
  coins: number;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  members: Record<string, GroupMember>;
}

export interface FirebaseBet {
  uid: string;
  username: string;
  type: string;
  description: string;
  area?: string;
  amount: number;
  multiplier: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
  coins_won: number;
}
