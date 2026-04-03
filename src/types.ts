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

/**
 * Type guard: validates that a raw Firebase value conforms to GroupMember.
 */
export function isGroupMember(val: unknown): val is GroupMember {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const v = val as Record<string, unknown>;
  return (
    typeof v.username === "string" &&
    typeof v.avatar_emoji === "string" &&
    typeof v.coins === "number" &&
    isFinite(v.coins)
  );
}

/**
 * Type guard: validates that a raw Firebase value conforms to Group.
 */
export function isGroup(val: unknown): val is Group {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const v = val as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    typeof v.name !== "string" ||
    typeof v.created_by !== "string"
  ) {
    return false;
  }
  if (v.members !== undefined && v.members !== null) {
    if (typeof v.members !== "object" || Array.isArray(v.members)) return false;
    for (const member of Object.values(v.members as Record<string, unknown>)) {
      if (!isGroupMember(member)) return false;
    }
  }
  return true;
}

/**
 * Safely parses a raw Firebase snapshot value into a Record<string, Group>.
 * Skips entries that do not pass validation.
 */
export function parseGroupsSnapshot(raw: unknown): Record<string, Group> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, Group> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    // Protect against prototype pollution
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    const candidate = { ...(value as object), id: key };
    if (isGroup(candidate)) {
      result[key] = candidate;
    }
  }
  return result;
}
