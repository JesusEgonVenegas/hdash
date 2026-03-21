"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Debt } from "@/types/debt";

export default function EditDebtForm({ debt }: { debt: Debt }) {
    const router = useRouter();
    const { token } = useAuth();
    const [name, setName] = useState(debt.name);
    const [amount, setAmount] = useState(String(debt.startingAmount));
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
                startingAmount: parseFloat(amount),
                interestRate: parseFloat(interestRate),
                minPayment: parseFloat(minPayment),
                dueDay: parseInt(dueDay),
            };

            await apiFetch(`/api/debts/${debt.id}`, {
                method: "PUT",
                body: payload,
                token,
            });

            router.push(`/debts/${debt.id}`);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="border border-neutral-700 p-6 max-w-md">
            <h2 className="text-sm text-green-400 mb-6">{"> "}EDIT DEBT</h2>

            {error && (
                <div className="ascii-error mb-4">
                    [ERROR] {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-neutral-400 mb-1">NAME:</label>
                    <input
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">AMOUNT:</label>
                    <input
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">INTEREST RATE:</label>
                    <input
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">MIN PAYMENT:</label>
                    <input
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        value={minPayment}
                        onChange={(e) => setMinPayment(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">DUE DAY:</label>
                    <input
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                    />
                </div>

                <button
                    disabled={isSubmitting}
                    className="w-full border border-green-400 py-2 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                >
                    {isSubmitting ? "Saving..." : "[ SAVE CHANGES ]"}
                </button>
            </form>
        </div>
    );
}
