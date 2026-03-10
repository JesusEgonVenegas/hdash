"use client";

import { Debt } from "@/types/debt";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

export default function EditPaymentForm({ payment, debts }: { payment: any, debts: Debt[] }) {
    const router = useRouter();
    const { token } = useAuth();

    const [amount, setAmount] = useState(String(payment.amount));

    const initialDate = payment.paidAt.slice(0, 10); // YYYY-MM-DD
    const [paidAt, setPaidAt] = useState(initialDate);

    const [selectedDebtId, setSelectedDebtId] = useState(payment.debtId)

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await apiFetch(`/api/payments/${payment.id}`, {
                method: "PUT",
                body: {
                    amount: parseFloat(amount),
                    paidAt: new Date(paidAt).toISOString(),
                    debtId: selectedDebtId
                },
                token,
            });

            router.push("/payments");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!confirm("Delete this payment?")) return

        try {
            setLoading(true)
            await apiFetch(`/api/payments/${payment.id}`, {
                method: "DELETE",
                token,
            });

            router.push("/payments")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 ascii-panel p-4 font-mono">

            {error && <p className="text-red-400">{error}</p>}

            {/* Amount */}
            <div className="flex flex-col">
                <label className="text-sm text-neutral-300 mb-1">amount</label>
                <input
                    type="number"
                    className="bg-neutral-900 text-white border border-neutral-600 px-2 py-1 focus:outline-none"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </div>

            {/* Date */}
            <div className="flex flex-col">
                <label className="text-sm text-neutral-300 mb-1">date</label>
                <input
                    type="date"
                    className="bg-neutral-900 text-white border border-neutral-600 px-2 py-1 focus:outline-none"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                />
            </div>

            {/* Debt selector */}
            <div className="flex flex-col">
                <label className="text-sm text-neutral-300 mb-1">debt</label>
                <select
                    value={selectedDebtId}
                    className="bg-neutral-900 text-white border border-neutral-600 px-2 py-1 focus:outline-none"
                    onChange={(e) => setSelectedDebtId(e.target.value)}
                >
                    {debts.map((debt) => (
                        <option key={debt.id} value={debt.id} className="text-black">
                            {debt.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Save */}
            <button
                disabled={loading}
                className="ascii-button mt-2 hover:text-blue-300 disabled:opacity-50"
            >
                {loading ? "saving..." : "save changes"}
            </button>

            {/* Delete */}
            <button
                type="button"
                disabled={loading}
                onClick={handleDelete}
                className="ascii-button mt-2 hover:text-red-400 text-red-300 border-red-500 disabled:opacity-50"
            >
                delete payment
            </button>

        </form>
    );
}
