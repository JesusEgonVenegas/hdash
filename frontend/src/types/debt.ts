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

export type DebtState = {
    debt: Debt
    balance: number
}

export type DebtWithBalance = Debt & {
    balance: number;
    paidTotal: number;
}
