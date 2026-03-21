export interface Payment {
    id: string;
    amount: number;
    paidAt: string; // ISO string from backend
    debtId: string;
}

export interface PaymentApi {
    id: string;
    amount: number;
    paidAt: string;
    debt: {
        id: string;
        name: string;
    };
    originalAmount: number;
    minPayment: number;
    interestRate: number;
}

