export type MoneyType = "income" | "expense";

export interface Category {
  _id: string;
  name: string;
  type: MoneyType;
  isSystem: boolean;
  icon?: string;
  color?: string;
}

export interface Transaction {
  _id: string;
  type: MoneyType;
  title: string;
  notes?: string;
  amount: number;
  transactionDate: string;
  categoryId?: string;
  currency: "INR";
  recurring?: {
    enabled: boolean;
    frequency?: "monthly" | "yearly";
  };
}

export interface Budget {
  _id: string;
  name: string;
  amount: number;
  cycle: "monthly" | "quarterly" | "yearly";
  currency: "INR";
  categoryId?: string;
  periodStart: string;
  periodEnd: string;
}

export interface FinancePayload {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
}
