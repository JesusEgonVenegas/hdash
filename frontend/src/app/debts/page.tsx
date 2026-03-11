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
        <section className="space-y-6">
            <div className="border border-neutral-700 p-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-lg text-green-400">{"> "}DEBTS</h1>
                    <a
                        href="/debts/simulate"
                        className="border border-green-400 py-1 px-3 text-green-400 hover:bg-green-400/10 text-sm"
                    >
                        [ SIMULATE ]
                    </a>
                </div>
            </div>

            {error ? (
                <div className="ascii-error">
                    [ERROR] {error}
                </div>
            ) : debts === null ? (
                <p className="text-neutral-500 text-sm">loading...</p>
            ) : (
                <DebtSheet initialDebts={debts} />
            )}
        </section>
    );
}
