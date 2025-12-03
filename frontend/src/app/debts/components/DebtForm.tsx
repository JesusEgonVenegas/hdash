"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DebtForm() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [minPayment, setMinPayment] = useState("");
    const [dueDay, setDueDay] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const payload = {
                name,
                amount: parseFloat(amount),
                interestRate: parseFloat(interestRate),
                minPayment: parseFloat(minPayment),
                dueDay: parseInt(dueDay, 10),
            }

            const res = await fetch("http://localhost:5063/api/debts", {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const message = await res.text();
                throw new Error(message || "Failed to create debt");
            }

            router.push("/debts")
        } catch (err: any) {
            console.error(err);
            setError(err.message ?? "Something went wrong");
        } finally {
            setIsSubmitting(false);
        };

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
                {isSubmitting ? "Saving..." : "Add Debt"}
            </button>

            {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
        </form>
    );
}

