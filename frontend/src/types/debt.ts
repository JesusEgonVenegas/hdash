export type Debt = {
    id: string;
    name: string;
    amount: number;
    interestRate: number;
    minPayment: number;
    dueDay: number;
    createdAt?: string;
    updatedAt?: string;
}
