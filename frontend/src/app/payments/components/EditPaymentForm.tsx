"use client";

import { Debt } from "@/types/debt";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

export default function EditPaymentForm({ payment, debts }: { payment: any; debts: Debt[] }) {
    const router = useRouter();
    const { token } = useAuth();

    const [amount, setAmount] = useState(String(payment.amount));

    const initialDate = payment.paidAt.slice(0, 10);
    const [paidAt, setPaidAt] = useState(initialDate);

    const [selectedDebtId, setSelectedDebtId] = useState(payment.debtId);

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
                    debtId: selectedDebtId,
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
        if (!confirm("Delete this payment?")) return;

        try {
            setLoading(true);
            await apiFetch(`/api/payments/${payment.id}`, {
                method: "DELETE",
                token,
            });

            router.push("/payments");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="border border-neutral-700 p-6 max-w-md">
            <h2 className="text-sm text-green-400 mb-6">{"> "}EDIT PAYMENT</h2>

            {error && (
                <div className="ascii-error mb-4">
                    [ERROR] {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-neutral-400 mb-1">AMOUNT:</label>
                    <input
                        type="number"
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">DATE:</label>
                    <input
                        type="date"
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        value={paidAt}
                        onChange={(e) => setPaidAt(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">DEBT:</label>
                    <select
                        value={selectedDebtId}
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        onChange={(e) => setSelectedDebtId(e.target.value)}
                    >
                        {debts.map((debt) => (
                            <option key={debt.id} value={debt.id} className="bg-neutral-900">
                                {debt.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    disabled={loading}
                    className="w-full border border-green-400 py-2 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                >
                    {loading ? "Saving..." : "[ SAVE CHANGES ]"}
                </button>

                <button
                    type="button"
                    disabled={loading}
                    onClick={handleDelete}
                    className="w-full ascii-button-danger py-2 disabled:opacity-50"
                >
                    [ DELETE PAYMENT ]
                </button>
            </form>
        </div>
    );
}
