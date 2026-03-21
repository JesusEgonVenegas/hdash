"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Debt } from "@/types/debt";
import SimulationClient from "../components/SimulationClient";

export default function DebtSimulationPage() {
    const { token, isLoading } = useAuth();
    const [debts, setDebts] = useState<Debt[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !token) return;

        async function load() {
            try {
                const data = await apiFetch<Debt[]>("/api/simulation", { token });
                setDebts(data);
            } catch (err: any) {
                setError(err.message ?? "Failed to load simulation data");
            }
        }

        load();
    }, [token, isLoading]);

    return (
        <section className="text-white font-mono space-y-6">
            <header className="ascii-panel p-4">
                <h1 className="text-xl font-bold">Debt Simulation</h1>
            </header>

            <div className="ascii-panel p-4">
                {error ? (
                    <p className="text-red-400">{error}</p>
                ) : debts === null ? (
                    <p className="text-neutral-500">loading...</p>
                ) : (
                    <SimulationClient debts={debts} />
                )}
            </div>
        </section>
    );
}
