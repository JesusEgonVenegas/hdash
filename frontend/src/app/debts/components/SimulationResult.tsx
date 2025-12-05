import React from "react";

function AsciiBar({ percent, danger }: { percent: number; danger: boolean }) {
    const total = 20;
    const filled = Math.round((percent / 100) * total);
    const empty = total - filled;

    return (
        <span
            className={`font-mono text-xs ${danger ? "text-red-400" : "text-blue-300"
                }`}
        >
            {"█".repeat(filled)}
            {"░".repeat(empty)}
        </span>
    );
}

export default function SimulationResult({ result }: { result: any }) {
    const totals = result?.monthlyTotals || [];

    if (totals.length === 0) {
        return <p className="text-neutral-400 font-mono">No simulation data.</p>;
    }

    const maxTotal = totals[0].total;

    return (
        <div className="ascii-panel p-4 space-y-4 font-mono">
            <h2 className="text-xl font-semibold">Payoff Timeline</h2>
            <p className="text-sm text-neutral-400">
                Remaining debt each month (ASCII bars)
            </p>

            <div className="space-y-1">
                {totals.slice(0, 24).map((entry: any) => {
                    const raw = (entry.total / maxTotal) * 100;
                    const percent = Math.min(raw, 100);
                    const danger = raw > 100;

                    return (
                        <div key={entry.month} className="flex items-center gap-3 text-xs">
                            <span className="w-10">M{entry.month}</span>

                            <AsciiBar percent={percent} danger={danger} />

                            <span className="w-24 text-right text-neutral-300">
                                ${entry.total.toFixed(0)}
                            </span>

                            {danger && (
                                <span className="text-red-400">not progressing</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {totals.length > 24 && (
                <p className="text-xs text-neutral-500 mt-2">
                    … showing only the first 24 months
                </p>
            )}
        </div>
    );
}

