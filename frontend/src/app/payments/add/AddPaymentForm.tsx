"use client"

import { Debt } from "@/types/debt";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

export default function AddPaymentForm({ debts }: { debts: Debt[] }) {
    const router = useRouter()
    const { token } = useAuth();

    const [amount, setAmount] = useState("")

    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState(today);

    const [selectedDebtId, setSelectedDebtId] = useState(
        debts.length > 0 ? debts[0].id : "")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: any) {
        e.preventDefault()
        setError(null);
        setIsSubmitting(true);
        if (!amount || !selectedDebtId || !date) {
            setError("Please fill all fields.")
            setIsSubmitting(false)
            return
        }
        if (isNaN(parseFloat(amount))) {
            setError("Amount must be a valid number.")
            setIsSubmitting(false)
            return
        }

        try {
            const payload = {
                amount: parseFloat(amount),
                date: date
            }

            await apiFetch(`/api/debts/${selectedDebtId}/payments`, {
                method: "POST",
                body: payload,
                token,
            });

            router.push("/payments")
        } catch (err: any) {
            console.error(err);
            setError(err.message ?? "Something went wrong");
        } finally {
            setIsSubmitting(false);
        };

    }

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <p>{error}</p>}
            <div className="flex flex-col">
                <label className="text-sm text-neutral-300 mb-1">amount</label>
                <input
                    type="number"
                    className="ascii-input w-full"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </div>

            <div className="flex flex-col">
                <label className="text-sm text-neutral-300 mb-1">date</label>
                <input
                    className="ascii-input w-full"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />
            </div>

            <div className="flex flex-col">
                <label className="text-sm text-neutral-300 mb-1">debt</label>
                <select
                    value={selectedDebtId}
                    className="ascii-select w-full"
                    onChange={(e) => setSelectedDebtId(e.target.value)}
                >
                    {debts.map((debt) => (
                        <option
                            className="text-black"
                            key={debt.id}
                            value={debt.id}
                        >{debt.name}</option>
                    ))}
                </select>

            </div>

            <button
                disabled={isSubmitting}
                className="ascii-button mt-2 hover:text-blue-300 disabled:opacity-50"
            >
                {isSubmitting ? "saving..." : "save payment"}
            </button>

        </form>
    )
}
