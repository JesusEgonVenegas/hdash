"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Debt } from "@/types/debt";

export default function EditDebtForm({ debt }: { debt: Debt }) {
    const router = useRouter();
    const [name, setName] = useState(debt.name);
    const [amount, setAmount] = useState(String(debt.amount));
    const [interestRate, setInterestRate] = useState(String(debt.interestRate));
    const [minPayment, setMinPayment] = useState(String(debt.minPayment));
    const [dueDay, setDueDay] = useState(String(debt.dueDay));
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const payload = {
                name,
                amount: parseFloat(amount),
                interestRate: parseFloat(interestRate),
                minPayment: parseFloat(minPayment),
                dueDay: parseInt(dueDay),
            };

            const res = await fetch(`http://localhost:5063/api/debts/${debt.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || "Failed to update debt");
            }

            router.push(`/debts/${debt.id}`);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-neutral-900 p-4 rounded">
            <div>
                <label className="block">Name</label>
                <input
                    className="w-full p-2 text-black bg-neutral-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>

            <div>
                <label className="block">Amount</label>
                <input
                    className="w-full p-2 text-black bg-neutral-500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </div>

            <div>
                <label className="block">Interest Rate</label>
                <input
                    className="w-full p-2 text-black bg-neutral-500"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                />
            </div>

            <div>
                <label className="block">Min Payment</label>
                <input
                    className="w-full p-2 text-black bg-neutral-500"
                    value={minPayment}
                    onChange={(e) => setMinPayment(e.target.value)}
                />
            </div>

            <div>
                <label className="block">Due Day</label>
                <input
                    className="w-full p-2 text-black bg-neutral-500"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                />
            </div>

            <button
                disabled={isSubmitting}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {isSubmitting ? "Saving..." : "Save Changes"}
            </button>

            {error && <p className="text-red-400">{error}</p>}
        </form>
    );
}

