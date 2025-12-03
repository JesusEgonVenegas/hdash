"use client";

import { Debt } from "@/types/debt";

type SimResult = {
    months: number;
    timeline: {
        month: number;
        debts: { id: string; name: string; amount: number }[];
    }[];
};

export default function SimulationResult({ result }: { result: SimResult }) {
    if (!result) return null;

    // total remaining per month
    const totals = result.timeline.map((entry) => {
        const total = entry.debts.reduce((sum, d) => sum + d.amount, 0)
        return { month: entry.month, total }
    })

    if (totals.length === 0) return null

    const maxTotal = totals[0].total;

    return (
        <div className="mt-6 p-4 bg-gray-800 rounded space-y-4">
            <h2 className="text-xl font-semibold">Payoff Timeline</h2>
            <p className="text-sm text-gray-300">
                Showing total remaining debt each month. Bar length = remaining % of starting total.
            </p>

            <div className="space-y-2">
                {totals.slice(0, 24).map((entry) => {
                    const percentage =
                        maxTotal === 0 ? 0 : (entry.total / maxTotal) * 100;

                    return (
                        <div
                            key={entry.month}
                            className="flex items-center gap-2 text-xs"
                        >
                            <span className="w-10">M{entry.month}</span>
                            <div className="flex-1 bg-gray-700 h-3 rounded">
                                <div
                                    className="h-3 rounded bg-blue-500"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <span className="w-28 text-right">
                                ${entry.total.toFixed(0)}
                            </span>
                        </div>
                    )
                })}
            </div>

            {totals.length > 24 && (
                <p className="text-xs text-gray-400 mt-2">
                    (Showing first 24 months only)
                </p>
            )}
        </div>
    )
}
