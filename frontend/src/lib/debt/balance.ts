import { DebtWithBalance } from "@/types/debt";

type SimulationDebt = {
    id: string;
    name: string;
    startingAmount: number;
    interestRate: number;
    minPayment: number;
    dueDay: number;
    // Authoritative interest-aware balance from the backend (optional for back-compat).
    currentBalance?: number;
    payments: { id: string; amount: number; paidAt: string}[];
}

export function toDebtWithBalance(d: SimulationDebt): DebtWithBalance {
    const paidTotal = d.payments.reduce((sum, p ) => sum + p.amount, 0);
    // Prefer the backend's interest-aware balance; fall back to a simple
    // principal-minus-payments estimate only if it wasn't provided.
    const balance = d.currentBalance ?? Math.max(d.startingAmount - paidTotal, 0);
    return {
        id: d.id,
        name: d.name,
        startingAmount: d.startingAmount,
        interestRate: d.interestRate,
        minPayment: d.minPayment,
        dueDay: d.dueDay,
        balance,
        paidTotal,
    }
}
