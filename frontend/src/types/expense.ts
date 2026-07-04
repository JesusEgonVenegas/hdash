export interface Expense {
    id: string;
    description: string;
    amount: number;
    paidByUserId: string;
    paidByName: string | null;
    paidByColor?: string | null;
    participantIds: string[];
    share: number;
    createdAt: string;
}

export interface Balance {
    userId: string;
    name: string;
    net: number; // positive = owed money, negative = owes
}

export interface Settlement {
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    amount: number;
}

export interface ExpensesResponse {
    expenses: Expense[];
    balances: Balance[];
    settlements: Settlement[];
    summary: { monthTotal: number; monthCount: number };
}

export interface RecurringExpense {
    id: string;
    description: string;
    amount: number;
    cadence: "weekly" | "monthly";
    nextRunDate: string;
    paidByUserId: string;
    paidByName: string;
    participantIds: string[];
}
