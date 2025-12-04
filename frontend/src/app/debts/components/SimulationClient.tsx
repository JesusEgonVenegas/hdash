"use client";

import { simulateMultipleDebts } from "@/lib/debt/utils";
import SimulationResult from "../components/SimulationResult";
import { Debt } from "@/types/debt";
import { useState } from "react";

export default function SimulationClient({ debts }: { debts: Debt[] }) {
    const [monthlyBudget, setMonthlyBudget] = useState("2000");
    const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");
    const [result, setResult] = useState<any>(null);

    const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);

    const handleRun = () => {
        const budget = parseFloat(monthlyBudget);
        const sim = simulateMultipleDebts(debts, budget, strategy);
        setResult(sim)
    };

    return (
        <section className="text-white p-6 space-y-6">

            {/* Total Debt Summary */}
            <div className="bg-neutral-900 p-4 rounded border border-neutral-700">
                <p className="text-lg font-semibold">
                    Total Debt:
                    <span className="text-blue-400 ml-2">
                        ${totalDebt.toLocaleString()}
                    </span>
                </p>
            </div>

            {/* Monthly Budget Input */}
            <div>
                <label className="block mb-1 font-medium">Monthly Budget</label>
                <input
                    type="number"
                    className="text-black p-2 bg-neutral-200"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                />
            </div>

            {/* Strategy Selector */}
            <div>
                <label className="block mb-1 font-medium">Strategy</label>
                <select
                    className="text-black p-2 bg-neutral-200"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as any)}
                >
                    <option value="avalanche">Avalanche (highest APR first)</option>
                    <option value="snowball">Snowball (lowest balance first)</option>
                </select>
            </div>

            {/* Run Simulation */}
            <button
                className="bg-blue-600 px-4 py-2 rounded"
                onClick={handleRun}
            >
                Run Simulation
            </button>

            {/* Results */}
            {result && (
                <SimulationResult result={result} />
            )}
        </section>
    )
}
