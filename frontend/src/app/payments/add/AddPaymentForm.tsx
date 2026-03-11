"use client";

import { Debt } from "@/types/debt";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

export default function AddPaymentForm({ debts }: { debts: Debt[] }) {
    const router = useRouter();
    const { token } = useAuth();

    const [amount, setAmount] = useState("");

    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState(today);

    const [selectedDebtId, setSelectedDebtId] = useState(
        debts.length > 0 ? debts[0].id : ""
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: any) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        if (!amount || !selectedDebtId || !date) {
            setError("Please fill all fields.");
            setIsSubmitting(false);
            return;
        }
        if (isNaN(parseFloat(amount))) {
            setError("Amount must be a valid number.");
            setIsSubmitting(false);
            return;
        }

        try {
            const payload = {
                amount: parseFloat(amount),
                date: date,
            };

            await apiFetch(`/api/debts/${selectedDebtId}/payments`, {
                method: "POST",
                body: payload,
                token,
            });

            router.push("/payments");
        } catch (err: any) {
            console.error(err);
            setError(err.message ?? "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="border border-neutral-700 p-6 max-w-md">
            <h2 className="text-sm text-green-400 mb-6">{"> "}ADD PAYMENT</h2>

            {error && (
                <div className="ascii-error mb-4">
                    [ERROR] {error}
                </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
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
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
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
                            <option
                                className="bg-neutral-900"
                                key={debt.id}
                                value={debt.id}
                            >
                                {debt.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    disabled={isSubmitting}
                    className="w-full border border-green-400 py-2 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                >
                    {isSubmitting ? "Saving..." : "[ SAVE PAYMENT ]"}
                </button>
            </form>
        </div>
    );
}
