"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { FairnessResponse } from "@/types/fairness";
import MemberDot from "../components/MemberDot";
import DebtsTabs from "../debts/components/DebtsTabs";

export default function FairnessPage() {
    const { token, user, isLoading } = useAuth();
    const [data, setData] = useState<FairnessResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setData(await apiFetch<FairnessResponse>("/api/fairness", { token }));
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load fairness");
        }
    }, [token]);

    useEffect(() => {
        if (isLoading || !token) return;
        load();
    }, [token, isLoading, load]);

    if (isLoading || (!data && !error)) return <p className="text-neutral-500 font-mono">loading...</p>;

    const money = (n: number) => "$" + n.toFixed(2);
    const signed = (n: number) => (n >= 0 ? "+" : "−") + "$" + Math.abs(n).toFixed(2);
    const totalSpend = data?.totals.spend ?? 0;
    const totalChores = data?.totals.choreCount ?? 0;
    // Scale the money bar by the largest single share so bars fill the row nicely.
    const maxPaid = Math.max(1, ...(data?.members.map((m) => m.paid) ?? [1]));

    return (
        <section className="space-y-6 font-mono">
            <DebtsTabs />
            <div className="flex items-baseline justify-between border-b border-neutral-700 pb-2">
                <h1 className="text-green-400 text-lg font-bold tracking-wider">FAIRNESS</h1>
                <span className="text-neutral-500 text-sm">
                    {data?.period}
                    {data?.splitMode === "proportional" && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-green-400 border border-green-400/40 px-1.5 py-0.5">by income</span>
                    )}
                </span>
            </div>

            {error && <div className="text-red-400 text-sm border border-red-500/40 px-3 py-2">[ERROR] {error}</div>}

            {!user?.householdId && (
                <div className="border border-yellow-600/50 bg-yellow-500/5 p-4 text-sm text-neutral-300">
                    <span className="text-yellow-400">[!]</span> Fairness compares housemates.{" "}
                    <Link href="/household" className="text-green-400 underline">Create or join a household</Link>.
                </div>
            )}

            {/* VERDICT */}
            {data && (
                <div className="border border-green-400/40 bg-green-400/5 p-4">
                    <div className="text-neutral-500 text-xs mb-1">{"> "}THE VERDICT</div>
                    <p className="text-green-300 text-sm">{data.verdict}</p>
                </div>
            )}

            {/* MONEY */}
            <div className="border border-neutral-800 p-4">
                <div className="flex items-baseline justify-between mb-3">
                    <h2 className="text-green-400 text-sm">{"> "}MONEY CARRIED</h2>
                    <span className="text-neutral-500 text-xs">{money(totalSpend)} shared this month</span>
                </div>
                {totalSpend === 0 ? (
                    <p className="text-neutral-500 text-sm">no shared expenses logged this month.</p>
                ) : (
                    <div className="space-y-3">
                        {data?.members.map((m) => (
                            <div key={m.userId} className="text-sm">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="flex items-center gap-2">
                                        <MemberDot color={m.color} />
                                        <span className="text-white">{m.userId === user?.id ? "you" : m.name}</span>
                                    </span>
                                    <span className="flex items-center gap-3 text-xs">
                                        <span className="text-neutral-500 tabular-nums">
                                            paid {money(m.paid)} · fair {money(m.fairShare)}
                                        </span>
                                        <span className={`tabular-nums w-20 text-right ${m.moneyNet > 0.005 ? "text-green-400" : m.moneyNet < -0.005 ? "text-red-400" : "text-neutral-500"}`}>
                                            {signed(m.moneyNet)}
                                        </span>
                                    </span>
                                </div>
                                <div className="h-1.5 bg-neutral-800">
                                    <div className="h-full bg-green-400/50" style={{ width: `${(m.paid / maxPaid) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                        <p className="text-neutral-600 text-xs pt-1">
                            green = carried more than a fair share this month · red = less. Settle the running balance on the{" "}
                            <Link href="/expenses" className="text-neutral-400 underline">expenses</Link> tab.
                        </p>
                    </div>
                )}
            </div>

            {/* CHORES */}
            <div className="border border-neutral-800 p-4">
                <div className="flex items-baseline justify-between mb-3">
                    <h2 className="text-green-400 text-sm">{"> "}CHORE LOAD</h2>
                    <span className="text-neutral-500 text-xs">{totalChores} done this month</span>
                </div>
                {totalChores === 0 ? (
                    <p className="text-neutral-500 text-sm">
                        no chores completed yet this month — this starts counting from now.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {data?.members.map((m) => (
                            <div key={m.userId} className="text-sm">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="flex items-center gap-2">
                                        <MemberDot color={m.color} />
                                        <span className="text-white">{m.userId === user?.id ? "you" : m.name}</span>
                                    </span>
                                    <span className="text-neutral-400 text-xs tabular-nums">
                                        {m.chores} done · {m.choreShare.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-1.5 bg-neutral-800">
                                    <div className="h-full bg-green-400/50" style={{ width: `${m.choreShare}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
