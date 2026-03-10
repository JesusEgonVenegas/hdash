"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Debt } from "@/types/debt";
import PaymentsClient from "./components/PaymentsClient";

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
        <section className="text-white font-mono space-y-6">
            <header className="ascii-panel p-4">
                <h1 className="text-xl font-bold">Payment History</h1>
            </header>

            <div className="ascii-panel p-4">
                {error ? (
                    <p className="text-red-400">{error}</p>
                ) : payments === null ? (
                    <p className="text-neutral-500">loading...</p>
                ) : (
                    <PaymentsClient payments={payments} debts={debts} />
                )}
            </div>
        </section>
    );
}
