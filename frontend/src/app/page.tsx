"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import DashboardClient from "./components/DashboardClient";

export default function DashboardPage() {
    const { token, isLoading } = useAuth();
    const [data, setData] = useState<{ debts: any[]; payments: any[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !token) return;

        async function load() {
            try {
                const [debts, payments] = await Promise.all([
                    apiFetch<any[]>("/api/debts", { token }),
                    apiFetch<any[]>("/api/payments?limit=5", { token }),
                ]);
                setData({ debts, payments });
            } catch (err: any) {
                setError(err.message ?? "Failed to load dashboard");
            }
        }

        load();
    }, [token, isLoading]);

    if (isLoading || !data) {
        return (
            <section className="text-white space-y-8">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                {error ? (
                    <p className="text-red-400">{error}</p>
                ) : (
                    <p className="text-neutral-500 font-mono">loading...</p>
                )}
            </section>
        );
    }

    return (
        <section className="text-white space-y-8">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <DashboardClient data={data} />
        </section>
    );
}
