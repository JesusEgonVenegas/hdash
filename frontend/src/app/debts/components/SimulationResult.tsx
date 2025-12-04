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
                    const raw = (entry.total / maxTotal) * 100;
                    const percent = maxTotal === 0 ? 0 : Math.min(raw, 100);
                    const isNotProgressing = raw > 100;

                    return (
                        <div key={entry.month} className="flex items-center gap-2 text-xs">
                            {/* Month */}
                            <span className="w-10">M{entry.month}</span>

                            {/* Bar */}
                            <div className="flex-1 bg-gray-700 h-3 rounded relative">
                                <div
                                    className={`h-3 rounded ${isNotProgressing ? "bg-red-600" : "bg-blue-500"}`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>

                            {/* Amount */}
                            <span className="w-24 text-right">
                                ${entry.total.toFixed(0)}
                            </span>

                            {/* Warning */}
                            {isNotProgressing && (
                                <span className="text-red-400 text-[10px] whitespace-nowrap">
                                    ⚠ not improving
                                </span>
                            )}
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
