"use client";

import { useState } from "react";

export default function AddPaymentForm({ debtId }: { debtId: string }) {
    const [amount, setAmount] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const res = await fetch(`http://localhost:5063/api/debts/${debtId}/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    paidAt: new Date().toISOString(),
                }),
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg)
            }

            window.location.reload();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={submit} className="bg-gray-800 p-4 rounded mt-4 space-y-2">
            <label className="block">Add Payment</label>
            <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-green-200 p-2 w-full"
                placeholder="Amount"
            />

            <button
                disabled={loading}
                className="bg-green-700 px-4 py-2 rounded hover:bg-green-800 disabled:opacity-50"
            >
                {loading ? "Adding..." : "Add Payment"}
            </button>

            {error && <p className="text-red-400">{error}</p>}
        </form>
    )

}
