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
