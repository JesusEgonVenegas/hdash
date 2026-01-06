import { Row } from "@/app/payments/components/PaymentsClient";

export function buildLedgerRows(rows: Row[]): Row[] {
    const paymentsByDebt = new Map<string, Row[]>();
    for (const p of rows) {
        const arr = paymentsByDebt.get(p.debtId) ?? [];
        arr.push(p)
        paymentsByDebt.set(p.debtId, arr)
    }
    const enriched: Row[] = [];
    for (const [_, payment] of paymentsByDebt) {
        let group = payment.sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
        let running = group[0].originalAmount;
        for (const p of group) {
            const before = running;
            const after = running - p.amount
            running = after

            enriched.push({
                ...p,
                balanceBefore: before,
                balanceAfter: after
            })
        }
    }
    return enriched;
}

