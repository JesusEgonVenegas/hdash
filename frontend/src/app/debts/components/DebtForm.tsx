"use client";

import { useState } from "react";
import { Debt } from "@/types/debt";

export default function DebtForm() {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [minPayment, setMinPayment] = useState("");
    const [dueDay, setDueDay] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newDebt: Debt = {
            id: crypto.randomUUID(),
            name,
            amount: parseFloat(amount),
            interestRate: parseFloat(interestRate),
            minPayment: parseFloat(minPayment),
            dueDay: parseInt(dueDay, 10),
        };

        console.log("New debt created:", newDebt);

        // Later this will POST to backend
        // await fetch("/api/debts", { method: "POST", body: JSON.stringify(newDebt) });

        alert("Debt added (mock). Check console.");
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
                <label className="block mb-1">Debt Name</label>
                <input
                    className="w-full p-2 text-black bg-neutral-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="RappiCard, Nu, etc..."
                    required
                />
            </div>

            <div>
                <label className="block mb-1">Amount</label>
                <input
                    className="w-full p-2 text-black bg-neutral-500"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                />
            </div>

            <div>
                <label className="block mb-1">Interest Rate (%)</label>
                <input
                    className="w-full p-2 text-black bg-neutral-500"
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    required
                />
            </div>

            <div>
                <label className="block mb-1">Minimum Payment</label>
                <input
                    className="w-full p-2 text-black bg-neutral-500"
                    type="number"
                    value={minPayment}
                    onChange={(e) => setMinPayment(e.target.value)}
                    required
                />
            </div>

            <div>
                <label className="block mb-1">Due Day (1–31)</label>
                <input
                    className="w-full p-2 text-black bg-neutral-500"
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    required
                />
            </div>

            <button
                type="submit"
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
            >
                Add Debt (Mock)
            </button>
        </form>
    );
}

