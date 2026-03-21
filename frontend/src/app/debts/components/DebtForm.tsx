"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

export default function DebtForm() {
    const router = useRouter();
    const { token } = useAuth();

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
                startingAmount: parseFloat(amount),
                interestRate: parseFloat(interestRate),
                minPayment: parseFloat(minPayment),
                dueDay: parseInt(dueDay, 10),
            };

            await apiFetch("/api/debts", {
                method: "POST",
                body: payload,
                token,
            });

            router.push("/debts");
        } catch (err: any) {
            console.error(err);
            setError(err.message ?? "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="border border-neutral-700 p-6 max-w-md">
            <h2 className="text-sm text-green-400 mb-6">{"> "}ADD NEW DEBT</h2>

            {error && (
                <div className="ascii-error mb-4">
                    [ERROR] {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-neutral-400 mb-1">DEBT NAME:</label>
                    <input
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="RappiCard, Nu, etc..."
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">AMOUNT:</label>
                    <input
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">INTEREST RATE (%):</label>
                    <input
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        type="number"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">MINIMUM PAYMENT:</label>
                    <input
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        type="number"
                        value={minPayment}
                        onChange={(e) => setMinPayment(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1">DUE DAY (1-31):</label>
                    <input
                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
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
                    disabled={isSubmitting}
                    className="w-full border border-green-400 py-2 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                >
                    {isSubmitting ? "Saving..." : "[ ADD DEBT ]"}
                </button>
            </form>
        </div>
    );
}
