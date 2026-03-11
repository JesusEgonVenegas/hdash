"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import DashboardClient from "./components/DashboardClient";

export default function DashboardPage() {
    const { token, user, isLoading } = useAuth();
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
            <section className="space-y-6">
                <div className="border border-neutral-700 p-4">
                    <h1 className="text-lg text-green-400">{"> "}DASHBOARD</h1>
                </div>
                {error ? (
                    <div className="ascii-error">
                        [ERROR] {error}
                    </div>
                ) : (
                    <p className="text-neutral-500 text-sm">loading...</p>
                )}
            </section>
        );
    }

    return (
        <section className="space-y-6">
            <div className="border border-neutral-700 p-4">
                <h1 className="text-lg text-green-400">{"> "}DASHBOARD</h1>
                <p className="text-neutral-500 text-xs mt-1">
                    {user?.householdName
                        ? `household: ${user.householdName}`
                        : "personal overview"}
                </p>
            </div>

            {!user?.householdId && (
                <div className="border border-yellow-600/50 bg-yellow-500/5 p-4">
                    <span className="text-yellow-400">[!]</span>{" "}
                    <span className="text-neutral-300 text-sm">
                        You&apos;re not in a household.{" "}
                        <Link href="/household" className="text-green-400 underline">
                            Create or join one
                        </Link>{" "}
                        to share grocery lists, todos, and chores with your housemates.
                    </span>
                </div>
            )}

            <DashboardClient data={data} />
        </section>
    );
}
