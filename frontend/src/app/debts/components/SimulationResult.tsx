import type { MultiDebtSimulation } from "@/lib/debt/utils";

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

function money(n: number) {
    return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// 33 -> "2 yr 9 mo"
function duration(months: number) {
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y === 0) return `${m} mo`;
    if (m === 0) return `${y} yr`;
    return `${y} yr ${m} mo`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div>
            <div className="text-neutral-500 text-xs">{label}</div>
            <div className="text-lg text-white">{value}</div>
            {hint && <div className="text-neutral-600 text-xs">{hint}</div>}
        </div>
    );
}

export default function SimulationResult({ result }: { result: MultiDebtSimulation }) {
    const totals = result?.monthlyTotals || [];

    if (totals.length === 0) {
        return <p className="text-neutral-400 font-mono">Nothing to pay off — every balance is already zero.</p>;
    }

    const maxTotal = totals[0].total || 1;

    // The headline numbers are what actually separate avalanche from snowball,
    // so they lead; the month-by-month bars are the supporting detail.
    return (
        <div className="ascii-panel p-4 space-y-5 font-mono">
            {!result.feasible ? (
                <div className="ascii-error">
                    [!] this budget never clears the debt — the interest outruns it.
                    minimum payments alone come to {money(result.totalMinimums)}/mo.
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Stat
                        label="debt-free in"
                        value={duration(result.months!)}
                        hint={`${result.months} payments`}
                    />
                    <Stat label="total interest" value={money(result.totalInterest)} />
                    <Stat label="total paid" value={money(result.totalPaid)} />
                </div>
            )}

            {result.payoffOrder.length > 0 && (
                <div>
                    <div className="text-neutral-500 text-xs mb-1">payoff order</div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
                        {result.payoffOrder.map((p, i) => (
                            <span key={p.id} className="text-neutral-300">
                                {i > 0 && <span className="text-neutral-600 mr-2">→</span>}
                                {p.name}
                                <span className="text-neutral-600"> (m{p.month})</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <div className="text-neutral-500 text-xs mb-2">remaining debt each month</div>
                <div className="space-y-1">
                    {totals.slice(0, 24).map((entry) => {
                        const raw = (entry.total / maxTotal) * 100;
                        const percent = Math.min(raw, 100);
                        const danger = raw > 100;

                        return (
                            <div key={entry.month} className="flex items-center gap-3 text-xs">
                                <span className="w-10 text-neutral-500">M{entry.month}</span>

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
                        … showing the first 24 of {totals.length - 1} months
                    </p>
                )}
            </div>
        </div>
    );
}
