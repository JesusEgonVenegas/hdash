export interface LedgerRow {
    id: string;
    amount: number;
    rawDate: string;
    date: string;
    debtName: string;
    debtId: string;
    originalAmount: number;
    minPayment: number;
    interestRate: number;
    balanceBefore: number;
    balanceAfter: number;
}

export type SortField = "amount" | "date";
export type SortOrder = "asc" | "desc";

export function buildLedgerRows(rows: LedgerRow[]): LedgerRow[] {
    const byDebt = new Map<string, LedgerRow[]>();

    for (const row of rows) {
        const list = byDebt.get(row.debtId) ?? [];
        list.push(row);
        byDebt.set(row.debtId, list);
    }

    const result: LedgerRow[] = [];

    for (const [, payments] of byDebt) {
        const ordered = [...payments].sort(
            (a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()
        );

        let running = ordered[0].originalAmount;

        for (const p of ordered) {
            const before = running;
            const after = running - p.amount;

            running = after;

            result.push({
                ...p,
                balanceBefore: before,
                balanceAfter: after,
            });
        }
    }

    return result;
}

export function sortLedgerRows(
    rows: LedgerRow[],
    order: SortOrder,
    field: SortField
): LedgerRow[] {
    return [...rows].sort((a, b) => {
        if (field === "amount") {
            return order === "asc"
                ? a.amount - b.amount
                : b.amount - a.amount;
        }

        const aTime = new Date(a.rawDate).getTime();
        const bTime = new Date(b.rawDate).getTime();
        return order === "asc" ? aTime - bTime : bTime - aTime;
    });
}

