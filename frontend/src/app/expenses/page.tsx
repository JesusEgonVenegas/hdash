"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { ExpensesResponse } from "@/types/expense";
import type { Household, HouseholdMember } from "@/types/household";

export default function ExpensesPage() {
    const { token, user, isLoading } = useAuth();
    const [data, setData] = useState<ExpensesResponse | null>(null);
    const [members, setMembers] = useState<HouseholdMember[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [paidBy, setPaidBy] = useState("");
    const [split, setSplit] = useState<Set<string>>(new Set());
    const [posting, setPosting] = useState(false);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            const [exp, house] = await Promise.all([
                apiFetch<ExpensesResponse>("/api/expenses", { token }),
                apiFetch<Household>("/api/household", { token }).catch(() => null),
            ]);
            setData(exp);
            const m = house?.members ?? [];
            setMembers(m);
            setPaidBy((prev) => prev || user?.id || "");
            setSplit((prev) => (prev.size ? prev : new Set(m.map((x) => x.id))));
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load expenses");
        }
    }, [token, user?.id]);

    useEffect(() => {
        if (isLoading || !token) return;
        load();
    }, [token, isLoading, load]);

    async function add(e: FormEvent) {
        e.preventDefault();
        const amt = parseFloat(amount);
        if (!description.trim() || !(amt > 0) || split.size === 0) return;
        setPosting(true);
        try {
            await apiFetch("/api/expenses", {
                method: "POST",
                body: { description: description.trim(), amount: amt, paidByUserId: paidBy, participantIds: [...split] },
                token,
            });
            setDescription("");
            setAmount("");
            await load();
        } catch {
            setError("Could not add that expense.");
        } finally {
            setPosting(false);
        }
    }

    async function remove(id: string) {
        await apiFetch(`/api/expenses/${id}`, { method: "DELETE", token });
        await load();
    }

    function toggleSplit(id: string) {
        setSplit((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    if (isLoading || (!data && !error)) return <p className="text-neutral-500 font-mono">loading...</p>;

    const nameOf = (id: string) => members.find((m) => m.id === id)?.displayName ?? "someone";
    const money = (n: number) => "$" + n.toFixed(2);

    return (
        <section className="space-y-6 font-mono">
            <div className="flex items-baseline justify-between border-b border-neutral-700 pb-2">
                <h1 className="text-green-400 text-lg font-bold tracking-wider">EXPENSES</h1>
                <span className="text-neutral-500 text-sm">{user?.householdName ?? "personal"}</span>
            </div>

            {error && <div className="text-red-400 text-sm border border-red-500/40 px-3 py-2">[ERROR] {error}</div>}

            {!user?.householdId && (
                <div className="border border-yellow-600/50 bg-yellow-500/5 p-4 text-sm text-neutral-300">
                    <span className="text-yellow-400">[!]</span> Splitting works best in a household.{" "}
                    <Link href="/household" className="text-green-400 underline">Create or join one</Link>.
                </div>
            )}

            {/* SETTLE UP */}
            <div className="border border-neutral-800 p-4">
                <h2 className="text-green-400 text-sm mb-3">{"> "}SETTLE UP</h2>
                {data && data.settlements.length === 0 ? (
                    <p className="text-neutral-500 text-sm">all square — nobody owes anybody. ✓</p>
                ) : (
                    <ul className="space-y-2">
                        {data?.settlements.map((s, i) => (
                            <li key={i} className="flex items-center justify-between border border-neutral-800 px-3 py-2 text-sm">
                                <span>
                                    <span className="text-red-400">{s.fromName}</span>
                                    <span className="text-neutral-500"> owes </span>
                                    <span className="text-green-400">{s.toName}</span>
                                </span>
                                <span className="text-white tabular-nums">{money(s.amount)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* ADD EXPENSE */}
            <form onSubmit={add} className="border border-neutral-800 p-4 space-y-3">
                <h2 className="text-neutral-300 text-sm">{"> "}ADD EXPENSE</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="what was it for?"
                        className="flex-1 bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400 text-sm"
                    />
                    <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="w-28 bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400 text-sm"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                    <label className="flex items-center gap-2 text-neutral-400">
                        paid by
                        <select
                            value={paidBy}
                            onChange={(e) => setPaidBy(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-1 focus:outline-none focus:border-green-400"
                        >
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>{m.id === user?.id ? "you" : m.displayName}</option>
                            ))}
                        </select>
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-neutral-400">split between</span>
                        {members.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => toggleSplit(m.id)}
                                className={`px-2 py-1 border text-xs ${
                                    split.has(m.id)
                                        ? "border-green-400 text-green-400"
                                        : "border-neutral-700 text-neutral-600"
                                }`}
                            >
                                {m.id === user?.id ? "you" : m.displayName}
                            </button>
                        ))}
                    </div>
                    <button
                        type="submit"
                        disabled={posting || !description.trim() || !(parseFloat(amount) > 0) || split.size === 0}
                        className="border border-green-400 px-4 py-1.5 text-green-400 hover:bg-green-400/10 disabled:opacity-40 ml-auto"
                    >
                        {posting ? "…" : "[ ADD ]"}
                    </button>
                </div>
            </form>

            {/* HISTORY */}
            <div className="border border-neutral-800 p-4">
                <h2 className="text-green-400 text-sm mb-3">{"> "}HISTORY</h2>
                {!data || data.expenses.length === 0 ? (
                    <p className="text-neutral-500 text-sm">no expenses logged yet.</p>
                ) : (
                    <ul className="divide-y divide-neutral-800">
                        {data.expenses.map((e) => (
                            <li key={e.id} className="py-2 flex items-center justify-between text-sm group">
                                <div className="min-w-0">
                                    <span className="text-white">{e.description}</span>
                                    <div className="text-neutral-500 text-xs">
                                        {e.paidByUserId === user?.id ? "you" : e.paidByName} paid · {money(e.share)}/person · {e.participantIds.length} way
                                    </div>
                                </div>
                                <span className="flex items-center gap-3 shrink-0">
                                    <span className="text-neutral-300 tabular-nums">{money(e.amount)}</span>
                                    <button onClick={() => remove(e.id)} className="text-neutral-700 hover:text-red-400 opacity-0 group-hover:opacity-100">×</button>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
