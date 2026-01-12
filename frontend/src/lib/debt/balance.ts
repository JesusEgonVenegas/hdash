import { DebtWithBalance } from "@/types/debt";

type SimulationDebt = {
    id: string;
    name: string;
    startingAmount: number;
    interestRate: number;
    minPayment: number;
    dueDay: number;
    payments: { id: string; amount: number; paidAt: string}[];
}

export function toDebtWithBalance(d: SimulationDebt): DebtWithBalance {
    const paidTotal = d.payments.reduce((sum, p ) => sum + p.amount, 0);
    const balance = Math.max(d.startingAmount - paidTotal, 0)
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
