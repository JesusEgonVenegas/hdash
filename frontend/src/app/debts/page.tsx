"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { toDebtWithBalance } from "@/lib/debt/balance";
import { DebtWithBalance } from "@/types/debt";
import DebtSheet from "./components/DebtSheet";

export default function DebtsPage() {
    const { token, isLoading } = useAuth();
    const [debts, setDebts] = useState<DebtWithBalance[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !token) return;

        async function load() {
            try {
                const simDebts = await apiFetch<any[]>("/api/simulation", { token });
                setDebts(simDebts.map(toDebtWithBalance));
            } catch (err: any) {
                setError(err.message ?? "Failed to fetch debts");
            }
        }

        load();
    }, [token, isLoading]);

    return (
        <section className="text-white font-mono">
            {/* PAGE HEADER */}
            <header className="flex justify-between items-center mb-4 ascii-panel p-4">
                <h1 className="text-xl">debts</h1>

                <nav className="space-x-4">
                    <a href="/debts/simulate" className="ascii-button">simulate</a>
                </nav>
            </header>

            {error ? (
                <p className="text-red-400">{error}</p>
            ) : debts === null ? (
                <p className="text-neutral-500">loading...</p>
            ) : (
                <DebtSheet initialDebts={debts} />
            )}
        </section>
    );
}
