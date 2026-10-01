"use client";

import { simulateMultipleDebts } from "@/lib/debt/utils";
import SimulationResult from "../components/SimulationResult";
import type { SimulationDebt } from "@/types/debt";
import { useMemo, useState } from "react";

type Strategy = "avalanche" | "snowball";

const OTHER: Record<Strategy, Strategy> = {
    avalanche: "snowball",
    snowball: "avalanche",
};

export default function SimulationClient({ debts }: { debts: SimulationDebt[] }) {
    const [monthlyBudget, setMonthlyBudget] = useState("1200");
    const [strategy, setStrategy] = useState<Strategy>("avalanche");

    const budget = parseFloat(monthlyBudget);
    const validBudget = Number.isFinite(budget) && budget > 0;

    const totalDebt = debts.reduce((sum, d) => sum + (d.currentBalance ?? d.startingAmount), 0);
    const totalMinimums = debts.reduce((sum, d) => sum + (d.minPayment || 0), 0);

    // Recompute as you type / switch strategy. The old build-behind-a-button
    // version left a stale result on screen when the strategy changed.
    const result = useMemo(
        () => (validBudget ? simulateMultipleDebts(debts, budget, strategy) : null),
        [debts, budget, strategy, validBudget]
    );

    // What the other strategy would cost, so the trade-off is visible.
    const alternative = useMemo(
        () => (validBudget ? simulateMultipleDebts(debts, budget, OTHER[strategy]) : null),
        [debts, budget, strategy, validBudget]
    );

    const interestDelta =
        result?.feasible && alternative?.feasible
            ? result.totalInterest - alternative.totalInterest
            : null;

    return (
        <section className="space-y-6 font-mono">

            {/* Total Debt Summary */}
            <div className="ascii-panel p-4 space-y-1">
                <p className="text-neutral-300 text-sm">total debt</p>
                <p className="text-2xl font-bold text-blue-400">
                    ${totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-neutral-500 text-xs">
                    across {debts.length} debt{debts.length !== 1 ? "s" : ""} · minimums total $
                    {totalMinimums.toLocaleString()}/mo
                </p>
            </div>

            {/* Inputs */}
            <div className="ascii-panel p-4 space-y-4">

                {/* Budget Input */}
                <div className="flex flex-col">
                    <label className="text-sm text-neutral-300 mb-1">
                        monthly budget
                    </label>
                    <input
                        type="number"
                        value={monthlyBudget}
                        onChange={(e) => setMonthlyBudget(e.target.value)}
                        className="bg-transparent border border-neutral-600 px-2 py-1 text-white focus:outline-none"
                    />
                    {validBudget && budget < totalMinimums && (
                        <p className="text-yellow-400 text-xs mt-1">
                            below the ${totalMinimums.toLocaleString()}/mo minimum payments
                        </p>
                    )}
                </div>

                {/* Strategy Input */}
                <div className="flex flex-col">
                    <label className="text-sm text-neutral-300 mb-1">
                        payoff strategy
                    </label>
                    <select
                        value={strategy}
                        onChange={(e) => setStrategy(e.target.value as Strategy)}
                        className="bg-transparent border border-neutral-600 px-2 py-1 text-white focus:outline-none"
                    >
                        <option value="avalanche">avalanche (highest APR first)</option>
                        <option value="snowball">snowball (lowest balance first)</option>
                    </select>
                    <p className="text-neutral-500 text-xs mt-1">
                        both pay every minimum, then throw whatever is left at one target
                    </p>
                </div>
            </div>

            {/* Results */}
            {!validBudget ? (
                <p className="text-neutral-500 text-sm">enter a monthly budget to run the projection.</p>
            ) : (
                <>
                    {interestDelta !== null && (
                        <div className="ascii-panel p-3 text-xs">
                            {Math.abs(interestDelta) < 1 ? (
                                <span className="text-neutral-400">
                                    {strategy} and {OTHER[strategy]} cost the same here — no debt is both
                                    the smallest balance and the highest APR.
                                </span>
                            ) : interestDelta < 0 ? (
                                <span className="text-green-400">
                                    {strategy} saves ${Math.abs(interestDelta).toFixed(0)} in interest vs {OTHER[strategy]}
                                </span>
                            ) : (
                                <span className="text-yellow-400">
                                    {strategy} costs ${interestDelta.toFixed(0)} more interest than {OTHER[strategy]}
                                    {" — "}but clears its first debt sooner
                                </span>
                            )}
                        </div>
                    )}
                    {result && <SimulationResult result={result} />}
                </>
            )}
        </section>
    );
}
