export interface Payment {
    id: string;
    amount: number;
    paidAt: string; // ISO string from backend
    debtId: string;
}
