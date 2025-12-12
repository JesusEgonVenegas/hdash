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
