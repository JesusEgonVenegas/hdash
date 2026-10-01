import type { Debt, DebtState, SimulationDebt } from "@/types/debt"

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

// avoid infinite loops on a payment that never clears the interest
const MAX_MONTHS = 600; // 50 years

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

    while (balance > 0 && month < MAX_MONTHS) {
        const { newBalance, interest } = advanceOneMonth(
            balance,
            debt.interestRate,
            payment,
        );

        // A payment that doesn't even cover the interest never pays anything off.
        if (newBalance >= balance) break;

        month++;
        balance = newBalance;

        timeline.push({
            month,
            balance,
            interest
        })
    }

    return {
        months: balance <= 0 ? month : null,
        finalBalance: balance,
        totalInterest: timeline.reduce((sum, m) => sum + m.interest, 0),
        timeline,
    }
}

export type DebtWithAmount = Debt & { startingAmount: number };

export type MultiDebtSimulation = {
    /** Months until every debt is cleared, or null if the budget never gets there. */
    months: number | null;
    /** True when the budget clears everything inside MAX_MONTHS. */
    feasible: boolean;
    /** Total interest paid across every debt over the whole run. */
    totalInterest: number;
    /** Sum of every payment made. */
    totalPaid: number;
    /** The month each debt hit zero, in the order they were cleared. */
    payoffOrder: { id: string; name: string; month: number }[];
    /** Minimum payments due each month — the budget floor. */
    totalMinimums: number;
    timeline: { month: number; debts: { id: string; name: string; balance: number }[] }[];
    monthlyTotals: { month: number; total: number }[];
};

/**
 * Runs a real avalanche/snowball payoff.
 *
 * Every month: interest accrues on *every* outstanding debt, the minimum payment
 * is made on each, and whatever budget is left over is thrown at the single
 * target debt the strategy picks. As each debt clears, its minimum rolls into
 * the surplus — the snowball effect both strategies are named for.
 *
 * Starts from each debt's interest-aware `currentBalance` when the API supplied
 * one, so the projection continues from today rather than from the original
 * principal.
 */
export function simulateMultipleDebts(
    debts: SimulationDebt[],
    monthlyBudget: number,
    strategy: "avalanche" | "snowball"
): MultiDebtSimulation {
    const workingDebts: DebtState[] = debts
        .map(d => ({ debt: d, balance: d.currentBalance ?? d.startingAmount }))
        .filter(s => s.balance > 0);

    const totalMinimums = workingDebts.reduce((sum, s) => sum + (s.debt.minPayment || 0), 0);

    let month = 0;
    let totalInterest = 0;
    let totalPaid = 0;
    const payoffOrder: { id: string; name: string; month: number }[] = [];
    const timeline: MultiDebtSimulation["timeline"] = [];

    const snapshot = () => workingDebts.map(s => ({
        id: s.debt.id,
        name: s.debt.name,
        balance: s.balance,
    }));

    // Month 0 is today — the starting point of the chart.
    timeline.push({ month: 0, debts: snapshot() });

    while (workingDebts.some(s => s.balance > 0) && month < MAX_MONTHS) {
        month++;
        const balanceBefore = workingDebts.reduce((sum, s) => sum + s.balance, 0);

        // 1. Interest accrues on every outstanding debt, not just the target.
        for (const s of workingDebts) {
            if (s.balance <= 0) continue;
            const interest = calculateMonthlyInterest(s.balance, s.debt.interestRate);
            s.balance += interest;
            totalInterest += interest;
        }

        // 2. Minimums on everything, so the untargeted debts still move.
        let remaining = monthlyBudget;
        for (const s of workingDebts) {
            if (s.balance <= 0 || remaining <= 0) continue;
            const pay = Math.min(s.debt.minPayment || 0, s.balance, remaining);
            s.balance -= pay;
            remaining -= pay;
            totalPaid += pay;
        }

        // 3. Surplus goes to the strategy's target; when that clears, the leftover
        //    rolls straight onto the next one in the same month.
        while (remaining > 0.005) {
            const target = pickDebt(workingDebts, strategy);
            if (!target) break;
            const pay = Math.min(remaining, target.balance);
            target.balance -= pay;
            remaining -= pay;
            totalPaid += pay;
        }

        // Record debts cleared this month, in payoff order.
        for (const s of workingDebts) {
            if (s.balance <= 0.005 && !payoffOrder.some(p => p.id === s.debt.id)) {
                s.balance = 0;
                payoffOrder.push({ id: s.debt.id, name: s.debt.name, month });
            }
        }

        timeline.push({ month, debts: snapshot() });

        const balanceAfter = workingDebts.reduce((sum, s) => sum + s.balance, 0);
        // The budget can't even keep up with the interest — this never pays off.
        if (balanceAfter >= balanceBefore) {
            return {
                months: null,
                feasible: false,
                totalInterest: round2(totalInterest),
                totalPaid: round2(totalPaid),
                payoffOrder,
                totalMinimums: round2(totalMinimums),
                timeline,
                monthlyTotals: toMonthlyTotals(timeline),
            };
        }
    }

    const cleared = workingDebts.every(s => s.balance <= 0);

    return {
        months: cleared ? month : null,
        feasible: cleared,
        totalInterest: round2(totalInterest),
        totalPaid: round2(totalPaid),
        payoffOrder,
        totalMinimums: round2(totalMinimums),
        timeline,
        monthlyTotals: toMonthlyTotals(timeline),
    };
}

function round2(n: number) {
    return Math.round(n * 100) / 100;
}

function toMonthlyTotals(timeline: MultiDebtSimulation["timeline"]) {
    return timeline.map(entry => ({
        month: entry.month,
        total: entry.debts.reduce((sum, d) => sum + d.balance, 0),
    }));
}

/**
 * The one debt the strategy attacks this month: highest APR for avalanche,
 * smallest balance for snowball. Returns null once everything is paid off.
 */
export function pickDebt(debts: DebtState[], strategy: "avalanche" | "snowball"): DebtState | null {
    const unpaid = debts.filter(s => s.balance > 0);

    if (unpaid.length === 0) return null;

    if (strategy === "avalanche") {
        // Tie-break on the smaller balance so the order is stable.
        return unpaid.sort((a, b) =>
            b.debt.interestRate - a.debt.interestRate || a.balance - b.balance)[0];
    }

    if (strategy === "snowball") {
        // Tie-break on the higher APR so the order is stable.
        return unpaid.sort((a, b) =>
            a.balance - b.balance || b.debt.interestRate - a.debt.interestRate)[0];
    }

    throw new Error("Unknown strategy: " + strategy);
}
