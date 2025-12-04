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

    // total paid last 30 days
    const now = Date.now();
    const last30Days = payments.filter(
        (p) => now - new Date(p.paidAt).getTime() <= 30 * 24 * 60 * 60 * 1000
    );
    const totalPaid30 = last30Days.reduce((sum, p) => sum + p.amount, 0);

    // average payment in last 30 days
    const avgPayment30 =
        last30Days.length > 0 ? totalPaid30 / last30Days.length : 0;

    // next due debts (sorted)
    const upcoming = [...debts]
        .sort((a, b) => a.dueDay - b.dueDay)
        .slice(0, 3);

    // recent payments (limit 5)
    const recentPayments = [...payments]
        .sort(
            (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
        )
        .slice(0, 5);

    return (
        <section className="bg-neutral-900 border border-neutral-700 p-6 rounded-xl space-y-6 text-white font-mono">

            <h2 className="text-xl font-semibold">Household Financial Overview</h2>

            {/* Total Debt */}
            <div>
                <p className="text-neutral-400 text-sm">Total Remaining Debt</p>
                <p className="text-3xl font-bold text-blue-400">
                    ${totalDebt.toLocaleString()}
                </p>
            </div>

            {/* Payments Last 30 Days */}
            <div className="space-y-1">
                <p className="text-neutral-400 text-sm">Last 30 Days</p>
                <p>Total Paid: <span className="text-green-400">${totalPaid30.toFixed(0)}</span></p>
                <p>Avg Payment: <span className="text-neutral-200">${avgPayment30.toFixed(0)}</span></p>
            </div>

            {/* Upcoming Due Dates */}
            <div>
                <p className="text-neutral-400 text-sm mb-1">Upcoming Due Dates</p>
                {upcoming.map((d) => (
                    <div key={d.id} className="flex justify-between text-sm border-b border-neutral-700 py-1">
                        <span>{d.name}</span>
                        <span className="text-neutral-400">Day {d.dueDay}</span>
                    </div>
                ))}
            </div>

            {/* Recent Payments */}
            <div>
                <p className="text-neutral-400 text-sm mb-1">Recent Payments</p>
                {recentPayments.length === 0 && (
                    <p className="text-neutral-500 text-xs">No payments yet.</p>
                )}
                {recentPayments.map((p) => (
                    <div
                        key={p.id}
                        className="flex justify-between text-sm border-b border-neutral-700 py-1"
                    >
                        <span className="text-green-300">${p.amount}</span>
                        <span className="text-neutral-400">{formatDate(p.paidAt)}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

