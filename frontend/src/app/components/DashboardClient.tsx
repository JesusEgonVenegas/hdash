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

    const totalDebt = debts.reduce((sum, d) => sum + d.startingAmount, 0);

    const now = Date.now();
    const last30Days = payments.filter(
        (p) => now - new Date(p.paidAt).getTime() <= 30 * 24 * 60 * 60 * 1000
    );
    const totalPaid30 = last30Days.reduce((sum, p) => sum + p.amount, 0);
    const avgPayment30 = last30Days.length > 0 ? totalPaid30 / last30Days.length : 0;

    const upcoming = [...debts]
        .sort((a, b) => a.dueDay - b.dueDay)
        .slice(0, 3);

    const recentPayments = [...payments]
        .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
        .slice(0, 5);

    return (
        <div className="space-y-4">
            {/* STATS ROW */}
            <div className="grid grid-cols-3 gap-4">
                <div className="border border-neutral-700 p-4">
                    <div className="text-neutral-500 text-xs mb-1">TOTAL DEBT</div>
                    <div className="text-blue-400 text-xl">
                        ${totalDebt.toLocaleString()}
                    </div>
                </div>
                <div className="border border-neutral-700 p-4">
                    <div className="text-neutral-500 text-xs mb-1">PAID (30 DAYS)</div>
                    <div className="text-green-400 text-xl">
                        ${totalPaid30.toFixed(0)}
                    </div>
                </div>
                <div className="border border-neutral-700 p-4">
                    <div className="text-neutral-500 text-xs mb-1">AVG PAYMENT</div>
                    <div className="text-neutral-300 text-xl">
                        ${avgPayment30.toFixed(0)}
                    </div>
                </div>
            </div>

            {/* UPCOMING DUE DATES */}
            <div className="border border-neutral-700 p-4">
                <h2 className="text-sm text-green-400 mb-3">{"> "}UPCOMING DUE DATES</h2>
                {upcoming.length === 0 ? (
                    <p className="text-neutral-600 text-sm">no debts tracked</p>
                ) : (
                    <div className="space-y-1">
                        {upcoming.map((d) => (
                            <div key={d.id} className="flex justify-between py-1.5 border-b border-neutral-800 text-sm">
                                <span className="text-neutral-300">{d.name}</span>
                                <span className="text-neutral-500">day {d.dueDay}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* RECENT PAYMENTS */}
            <div className="border border-neutral-700 p-4">
                <h2 className="text-sm text-green-400 mb-3">{"> "}RECENT PAYMENTS</h2>
                {recentPayments.length === 0 ? (
                    <p className="text-neutral-600 text-sm">no payments recorded</p>
                ) : (
                    <div className="space-y-1">
                        {recentPayments.map((p) => (
                            <div
                                key={p.id}
                                className="flex justify-between py-1.5 border-b border-neutral-800 text-sm"
                            >
                                <span className="text-green-400">${p.amount}</span>
                                <span className="text-neutral-500">{formatDate(p.paidAt)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
