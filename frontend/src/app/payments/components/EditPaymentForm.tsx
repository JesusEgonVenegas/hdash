"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EditPaymentForm({ payment }: { payment: any }) {
    const router = useRouter();

    const [amount, setAmount] = useState(String(payment.amount));
    const [paidAt, setPaidAt] = useState(payment.paidAt.slice(0, 10)); // YYYY-MM-DD
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`http://localhost:5063/api/payments/${payment.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    paidAt: new Date(paidAt).toISOString(),
                }),
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg);
            }

            router.push(`/debts/${payment.debtId}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-neutral-900 p-4 rounded">
            <div>
                <label className="block">Amount</label>
                <input
                    type="number"
                    className="p-2 text-white bg-neutral-800 w-full"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </div>

            <div>
                <label className="block">Date</label>
                <input
                    type="date"
                    className="p-2 text-white bg-neutral-800 w-full"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                />
            </div>

            {error && <p className="text-red-400">{error}</p>}

            <button
                disabled={loading}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {loading ? "Saving..." : "Save Changes"}
            </button>
        </form>
    );
}

