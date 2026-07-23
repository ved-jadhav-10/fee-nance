export interface GroupMember {
  userId: { _id: string; name: string; email: string };
  role: "owner" | "member";
}

export interface Group {
  _id: string;
  name: string;
  inviteCode: string;
  members: GroupMember[];
}

export interface GroupExpense {
  _id: string;
  title: string;
  amount: number;
  splitType: string;
  incurredAt: string;
  notes?: string;
}

export interface MemberBalance {
  memberId: string;
  netAmount: number;
}

export interface PairwiseSettlement {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface Settlement {
  _id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  settledAt: string;
  note?: string;
}
