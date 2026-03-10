"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import DeleteDebtButton from "../components/DeleteDebtButton";
import AddPaymentForm from "../components/AddPaymentForm";
import DeletePaymentButton from "@/app/debts/components/DeletePaymentButton";

export default function DebtDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { token, isLoading } = useAuth();
    const [debt, setDebt] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !token || !id) return;

        async function load() {
            try {
                const [d, p] = await Promise.all([
                    apiFetch<any>(`/api/debts/${id}`, { token }),
                    apiFetch<any[]>(`/api/debts/${id}/payments`, { token }).catch(() => []),
                ]);
                setDebt(d);
                setPayments(p);
            } catch (err: any) {
                setError(err.message ?? "Failed to load debt");
            }
        }

        load();
    }, [token, isLoading, id]);

    if (isLoading || (!debt && !error)) {
        return (
            <section className="text-white p-6">
                {error ? (
                    <p className="text-red-400">{error}</p>
                ) : (
                    <p className="text-neutral-500 font-mono">loading...</p>
                )}
            </section>
        );
    }

    if (error || !debt) {
        return (
            <section className="text-white p-6">
                <p className="text-red-400">{error ?? "Debt not found"}</p>
            </section>
        );
    }

    return (
        <section className="text-white p-6 space-y-6">
            <h1 className="text-2xl font-bold">{debt.name}</h1>

            <div className="bg-gray-800 p-4 rounded space-y-2">
                <p><strong>Balance:</strong> ${debt.amount?.toLocaleString() ?? debt.startingAmount?.toLocaleString()}</p>
                <p><strong>Interest Rate:</strong> {debt.interestRate}% APR</p>
                <p><strong>Min Payment:</strong> ${debt.minPayment.toLocaleString()}</p>
                <p><strong>Due Day:</strong> {debt.dueDay}</p>
            </div>

            <AddPaymentForm debtId={id} />

            <section className="bg-gray-900 p-4 rounded">
                <h2 className="text-xl font-semibold mb-2">Payment History</h2>
                {payments.length === 0 && <p>No payments yet.</p>}
                <ul className="space-y-2">
                    {payments.map((p: any) => (
                        <li key={p.id} className="border-b border-gray-700 pb-2 flex justify-between">
                            <div>
                                <p><strong>Date:</strong> {new Date(p.paidAt).toLocaleDateString()}</p>
                                <p><strong>Amount:</strong> ${p.amount.toLocaleString()}</p>
                            </div>

                            <DeletePaymentButton id={p.id} />
                            <Link
                                href={`/payments/${p.id}/edit`}
                                className="text-blue-400 hover:text-blue-500 ml-4"
                            >
                                Edit
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            <div className="flex items-center gap-4">
                <Link
                    href={`/debts/${id}/edit`}
                    className="inline-block bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
                >
                    Edit Debt
                </Link>

                <DeleteDebtButton id={id} />
            </div>
        </section>
    );
}
