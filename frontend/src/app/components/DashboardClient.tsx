"use client";

import { Debt } from "@/types/debt";

function formatDate(dateString: string) {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
    }).format(d);
}

export default function DashboardClient({
    data,
}: {
    data: { debts: Debt[]; payments: any[] };
}) {
    const debts = data.debts;
    const payments = data.payments;

    // total remaining debt
    const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);

    // last 30 days
    const now = Date.now();
    const last30Days = payments.filter(
        (p) => now - new Date(p.paidAt).getTime() <= 30 * 24 * 60 * 60 * 1000
    );
    const totalPaid30 = last30Days.reduce((sum, p) => sum + p.amount, 0);
    const avgPayment30 = last30Days.length > 0 ? totalPaid30 / last30Days.length : 0;

    // upcoming due
    const upcoming = [...debts]
        .sort((a, b) => a.dueDay - b.dueDay)
        .slice(0, 3);

    // recent payments
    const recentPayments = [...payments]
        .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
        .slice(0, 5);

    return (
        <section className="ascii-panel font-mono text-sm">

            {/* HEADER */}
            <div className="mb-3">
                <h2 className="ascii-heading">Household Overview</h2>
            </div>

            {/* TOTAL DEBT */}
            <div className="mb-4">
                <div className="text-neutral-500">total_debt:</div>
                <div className="text-blue-400 text-xl">
                    ${totalDebt.toLocaleString()}
                </div>
            </div>

            {/* LAST 30 DAYS */}
            <div className="mb-4">
                <div className="text-neutral-500">last_30_days:</div>
                <div className="pl-4">
                    <div>paid ➜ <span className="text-green-400">${totalPaid30.toFixed(0)}</span></div>
                    <div>avg  ➜ <span className="text-neutral-300">${avgPayment30.toFixed(0)}</span></div>
                </div>
            </div>

            {/* UPCOMING */}
            <div className="mb-4">
                <div className="text-neutral-500">upcoming_due_dates:</div>
                {upcoming.map((d) => (
                    <div key={d.id} className="flex justify-between pl-4 border-b border-neutral-700 py-1">
                        <span>{d.name}</span>
                        <span className="text-neutral-400">day {d.dueDay}</span>
                    </div>
                ))}
            </div>

            {/* RECENT PAYMENTS */}
            <div>
                <div className="text-neutral-500">recent_payments:</div>

                {recentPayments.length === 0 && (
                    <div className="pl-4 text-neutral-600">none</div>
                )}

                {recentPayments.map((p) => (
                    <div
                        key={p.id}
                        className="flex justify-between pl-4 border-b border-neutral-700 py-1"
                    >
                        <span className="text-green-300">${p.amount}</span>
                        <span className="text-neutral-400">{formatDate(p.paidAt)}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

