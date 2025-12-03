import { Debt } from "@/types/debt"

export function calculateMonthlyInterest(amount: number, apr: number): number {
    const monthlyRate = (apr / 100) / 12;
    return amount * monthlyRate;
}

export function applyMonthlyInterest(amount: number, apr: number): number {
    const interest = calculateMonthlyInterest(amount, apr);
    return amount + interest;
}

export function applyPayment(amount: number, payment: number): number {
    const newAmount = amount - payment;

    // no negative balances
    return newAmount < 0 ? 0 : newAmount;
}

export function advanceOneMonth(
    debt: Debt,
    payment: number
): { newAmount: number; interest: number } {
    // apply interest before payment, cc companies do this
    //  interest is based on previous month balance
    const interest = calculateMonthlyInterest(debt.amount, debt.interestRate)
    let amountWithInterest = debt.amount + interest
    const newAmount = applyPayment(amountWithInterest, payment)

    return {
        newAmount,
        interest
    }
}

export function simulatePayoff(
    debt: Debt,
    payment: number
) {
    let month = 0;
    let amount = debt.amount;

    const timeline: {
        month: number;
        amount: number;
        interest: number;
    }[] = [];

    // avoid infinite loops
    const MAX_MONTHS = 600; // 50 years

    while (amount > 0 && month < MAX_MONTHS) {
        const { newAmount, interest } = advanceOneMonth(
            { ...debt, amount },
            payment
        );

        month++;
        amount = newAmount;

        timeline.push({
            month,
            amount,
            interest
        })

        return {
            months: month,
            finalAmount: amount,
            totalInterest: timeline.reduce((sum, m) => sum + m.interest, 0),
            timeline,
        }
    }
}

export type DebtWithAmount = Debt & { amount: number };

export function simulateMultipleDebts(
    debts: Debt[],
    monthlyBudget: number,
    strategy: "avalanche" | "snowball"
) {
    const workingDebts: DebtWithAmount[] = debts.map(d => ({ ...d }));

    let month = 0
    const timeline: any[] = [];

    const MAX_MONTHS = 600;

    while (workingDebts.some(d => d.amount > 0) && month < MAX_MONTHS) {
        month++;

        const target = pickDebt(workingDebts, strategy);

        const payment = monthlyBudget;

        const { newAmount, interest } = advanceOneMonth(
            target,
            payment
        );

        target.amount = newAmount;

        timeline.push({
            month,
            debts: workingDebts.map(d => ({
                id: d.id,
                name: d.name,
                amount: d.amount
            }))
        })
    }

    return {
        months: month,
        timeline
    };
}

export function pickDebt(debts: Debt[], strategy: "avalanche" | "snowball") {
    const unpaid = debts.filter(d => d.amount > 0);

    if (strategy === "avalanche") {
        return unpaid.sort((a, b) => b.interestRate - a.interestRate)[0];
    }

    if (strategy === "snowball") {
        return unpaid.sort((a, b) => a.amount - b.amount)[0];
    }

    throw new Error("Unknown strategy: " + strategy);
}

