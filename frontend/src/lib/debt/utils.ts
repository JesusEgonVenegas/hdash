import { Debt, DebtState } from "@/types/debt"

export function calculateMonthlyInterest(balance: number, apr: number): number {
    const monthlyRate = (apr / 100) / 12;
    return balance * monthlyRate;
}

export function applyMonthlyInterest(balance: number, apr: number): number {
    const interest = calculateMonthlyInterest(balance, apr);
    return balance + interest;
}

export function applyPayment(balance: number, payment: number): number {
    const newAmount = balance - payment;
    // no negative balances
    return newAmount < 0 ? 0 : newAmount;
}

export function advanceOneMonth(
    balance: number,
    apr: number,
    payment: number
) {
    // apply interest before payment, cc companies do this
    //  interest is based on previous month balance
    const interest = calculateMonthlyInterest(balance, apr)
    let withInterest = balance + interest
    const newBalance = applyPayment(withInterest, payment)

    return { newBalance, interest }
}

export function simulatePayoff(
    debt: Debt,
    payment: number
) {
    let month = 0;
    let balance = debt.startingAmount;

    const timeline: {
        month: number;
        balance: number;
        interest: number;
    }[] = [];

    // avoid infinite loops
    const MAX_MONTHS = 600; // 50 years

    while (balance > 0 && month < MAX_MONTHS) {
        const { newBalance, interest } = advanceOneMonth(
            balance,
            debt.interestRate,
            payment,
        );

        month++;
        balance = newBalance;

        timeline.push({
            month,
            balance,
            interest
        })

        return {
            months: month,
            finalBalance: balance,
            totalInterest: timeline.reduce((sum, m) => sum + m.interest, 0),
            timeline,
        }
    }
}

export type DebtWithAmount = Debt & { startingAmount: number };

export function simulateMultipleDebts(
    debts: Debt[],
    monthlyBudget: number,
    strategy: "avalanche" | "snowball"
) {
    const workingDebts: DebtState[] = debts.map(d => ({ debt: d, balance: d.startingAmount }));

    let month = 0
    const timeline: { month: number; debts: { id: string; name: string; balance: number }[] }[] = [];
    const MAX_MONTHS = 600;

    while (workingDebts.some(s => s.balance > 0) && month < MAX_MONTHS) {
        month++;

        const target = pickDebt(workingDebts, strategy);


        const { newBalance, interest } = advanceOneMonth(
            target.balance,
            target.debt.interestRate,
            monthlyBudget
        );

        target.balance = newBalance;

        timeline.push({
            month,
            debts: workingDebts.map(s => ({
                id: s.debt.id,
                name: s.debt.name,
                balance: s.balance
            }))
        })
    }

    const monthlyTotals = timeline.map(entry => ({
        month: entry.month,
        total: entry.debts.reduce((sum, d) => sum + d.balance, 0)
    }));

    return {
        months: month,
        timeline,
        monthlyTotals
    };
}

export function pickDebt(debts: DebtState[], strategy: "avalanche" | "snowball") {
    const unpaid = debts.filter(s => s.balance > 0);

    if (unpaid.length === 0) {
        throw new Error("No unpaid debts")
    }

    if (strategy === "avalanche") {
        return unpaid.sort((a, b) => b.debt.interestRate - a.debt.interestRate)[0];
    }

    if (strategy === "snowball") {
        return unpaid.sort((a, b) => a.balance - b.balance)[0];
    }

    throw new Error("Unknown strategy: " + strategy);
}

