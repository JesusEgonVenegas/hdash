"use client";

import { useEffect, useState, type ReactNode } from "react";
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
        <section className="space-y-6 font-mono">
            <div className="flex items-center justify-between border-b border-neutral-700 pb-2">
                <h1 className="text-lg text-green-400">{"> "}{debt.name}</h1>
                <Link href="/debts" className="text-neutral-500 hover:text-green-400 text-sm">← debts</Link>
            </div>

            <div className="border border-neutral-700 p-4 grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <Field label="balance" value={`$${(debt.balance ?? debt.startingAmount)?.toLocaleString()}`} highlight />
                <Field label="starting" value={`$${debt.startingAmount?.toLocaleString()}`} />
                <Field label="paid so far" value={`$${(debt.paidTotal ?? 0)?.toLocaleString()}`} />
                <Field label="apr" value={`${debt.interestRate}%`} />
                <Field label="min payment" value={`$${debt.minPayment.toLocaleString()}`} />
                <Field label="due day" value={debt.dueDay} />
            </div>

            <AddPaymentForm debtId={id} />

            <div className="border border-neutral-700 p-4">
                <h2 className="text-sm text-neutral-300 mb-3">{"> "}PAYMENT HISTORY</h2>
                {payments.length === 0 ? (
                    <p className="text-neutral-500 text-sm">no payments yet.</p>
                ) : (
                    <ul className="divide-y divide-neutral-800">
                        {payments.map((p: any) => (
                            <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                                <span className="text-neutral-400 tabular-nums">{new Date(p.paidAt).toLocaleDateString()}</span>
                                <span className="text-white tabular-nums">${p.amount.toLocaleString()}</span>
                                <span className="flex items-center gap-3">
                                    <Link href={`/payments/${p.id}/edit`} className="text-neutral-500 hover:text-green-400 text-xs">edit</Link>
                                    <DeletePaymentButton id={p.id} />
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex items-center gap-3">
                <Link
                    href={`/debts/${id}/edit`}
                    className="border border-green-400/60 text-green-400 hover:bg-green-400/10 px-3 py-1.5 text-sm"
                >
                    [ EDIT DEBT ]
                </Link>
                <DeleteDebtButton id={id} />
            </div>
        </section>
    );
}

function Field({ label, value, highlight = false }: { label: string; value: ReactNode; highlight?: boolean }) {
    return (
        <div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide">{label}</div>
            <div className={`tabular-nums ${highlight ? "text-green-400 text-base" : "text-neutral-200"}`}>{value}</div>
        </div>
    );
}
