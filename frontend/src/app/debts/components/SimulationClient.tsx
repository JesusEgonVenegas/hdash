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

    function handleRun() {
        const budget = parseFloat(monthlyBudget);
        const sim = simulateMultipleDebts(debts, budget, strategy);
        console.log(sim)
        setResult(sim);
    }

    return (
        <section className="space-y-6 font-mono">

            {/* Total Debt Summary */}
            <div className="ascii-panel p-4 space-y-1">
                <p className="text-neutral-300 text-sm">total debt</p>
                <p className="text-2xl font-bold text-blue-400">
                    ${totalDebt.toLocaleString()}
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
                </div>

                {/* Strategy Input */}
                <div className="flex flex-col">
                    <label className="text-sm text-neutral-300 mb-1">
                        payoff strategy
                    </label>
                    <select
                        value={strategy}
                        onChange={(e) => setStrategy(e.target.value as any)}
                        className="bg-transparent border border-neutral-600 px-2 py-1 text-white focus:outline-none"
                    >
                        <option value="avalanche">avalanche (highest APR first)</option>
                        <option value="snowball">snowball (lowest balance first)</option>
                    </select>
                </div>

                {/* Run Simulation */}
                <button
                    onClick={handleRun}
                    className="ascii-button mt-2 hover:text-blue-300"
                >
                    run simulation
                </button>
            </div>

            {/* Results */}
            {result && <SimulationResult result={result} />}
        </section>
    );
}

