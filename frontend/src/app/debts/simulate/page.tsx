"use client";

import { simulateMultipleDebts } from "@/lib/debt/utils";
import { Debt } from "@/types/debt";
import { useState } from "react";

export default function DebtSimulationPage() {
    const [monthlyBudget, setMonthlyBudget] = useState("2000");
    const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");
    const [result, setResult] = useState<any>(null);

    const mockDebts: Debt[] = [
        { id: "1", name: "RappiCard", amount: 28600, interestRate: 90, minPayment: 17763.68, dueDay: 28 },
        { id: "2", name: "Banamex", amount: 18854.43, interestRate: 61, minPayment: 430, dueDay: 4 },
        { id: "3", name: "Nu", amount: 1300, interestRate: 69, minPayment: 100, dueDay: 27 },
    ]

    const handleRun = () => {
        const budget = parseFloat(monthlyBudget);
        const sim = simulateMultipleDebts(mockDebts, budget, strategy);
        setResult(sim)
    };

    return (
        <main className="text-white p-6 space-y-6">
            <h1 className="text-2xl font-bold">Debt Simulation</h1>

            {/* Monthly Budget Input */}
            <div>
                <label className="block mb-1 font-medium">Monthly Budget</label>
                <input
                    type="number"
                    className="text-black p-2"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                />
            </div>

            {/* Strategy Selector */}
            <div>
                <label className="block mb-1 font-medium">Strategy</label>
                <select
                    className="text-black p-2"
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
                <div className="mt-6 p-4 bg-gra-800 rounded">
                    <h2 className="text-xl font-semibold mb-2">Results</h2>
                    <p><strong>Months:</strong> {result.months}</p>
                    <p><strong>Total Interest Paid:</strong> *TODO: SHOW TOTAL INTEREST PAID*</p>

                    <details className="mt-4">
                        <summary className="cursor-pointer mb-2">Monthly Breakdown</summary>
                        <pre className="mt-2 text-xs bg-black/40 p-2 rounded">
                            {JSON.stringify(result.timeline.slice(0, 12), null, 2)}
                        </pre>
                        <p className="text-xs mt-2">(Showin first 12 months only)</p>
                    </details>
                </div>
            )}
        </main>
    )
}
