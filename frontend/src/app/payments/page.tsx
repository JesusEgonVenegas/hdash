"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Debt } from "@/types/debt";
import PaymentsClient from "./components/PaymentsClient";
import DebtsTabs from "../debts/components/DebtsTabs";

export default function PaymentsPage() {
    const { token, isLoading } = useAuth();
    const [payments, setPayments] = useState<any[] | null>(null);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !token) return;

        async function load() {
            try {
                const [p, d] = await Promise.all([
                    apiFetch<any[]>("/api/payments?limit=200", { token }),
                    apiFetch<Debt[]>("/api/debts", { token }),
                ]);
                setPayments(p);
                setDebts(d);
            } catch (err: any) {
                setError(err.message ?? "Failed to load payments");
            }
        }

        load();
    }, [token, isLoading]);

    return (
        <section className="space-y-6">
            <DebtsTabs />
            <div className="border border-neutral-700 p-4">
                <h1 className="text-lg text-green-400">{"> "}PAYMENT HISTORY</h1>
            </div>

            {error ? (
                <div className="ascii-error">
                    [ERROR] {error}
                </div>
            ) : payments === null ? (
                <p className="text-neutral-500 text-sm">loading...</p>
            ) : (
                <div className="border border-neutral-700 p-4">
                    <PaymentsClient payments={payments} debts={debts} />
                </div>
            )}
        </section>
    );
}
