export type Debt = {
    id: string;
    name: string;
    startingAmount: number;
    interestRate: number;
    minPayment: number;
    dueDay: number;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * What /api/simulation returns: a debt plus the backend's interest-aware
 * balance, so projections start from today rather than the original principal.
 */
export type SimulationDebt = Debt & {
    currentBalance?: number;
    payments?: { id: string; amount: number; paidAt: string }[];
}

export type DebtState = {
    debt: SimulationDebt
    balance: number
}

export type DebtWithBalance = Debt & {
    balance: number;
    paidTotal: number;
}
