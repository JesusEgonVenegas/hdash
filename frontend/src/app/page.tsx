"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { ChoreItem } from "@/types/chore";
import type { PaymentApi } from "@/types/payment";
import type { HouseholdNote } from "@/types/note";
import type { ExpensesResponse } from "@/types/expense";

type DebtWithBalance = {
    id: string;
    name: string;
    balance: number;
    paidTotal: number;
    interestRate: number;
    dueDay: number;
};

type Today = {
    counts: { chores: number; todos: number; events: number; debtsDue: number; grocery: number };
};

type Reminder = {
    type: "chore" | "todo" | "event" | "debt";
    severity: "overdue" | "due" | "upcoming";
    title: string;
    detail: string;
    refId: string;
    date: string;
};

type Data = {
    today: Today;
    reminders: Reminder[];
    debts: DebtWithBalance[];
    payments: PaymentApi[];
    chores: ChoreItem[];
    notes: HouseholdNote[];
    expenses: ExpensesResponse;
};

const NOTE_ACCENT: Record<string, string> = {
    yellow: "border-l-yellow-500/60",
    green: "border-l-green-500/60",
    blue: "border-l-blue-500/60",
    pink: "border-l-pink-500/60",
};

const SEVERITY: Record<Reminder["severity"], { label: string; cls: string }> = {
    overdue: { label: "overdue", cls: "text-red-400 border-red-500/40" },
    due: { label: "today", cls: "text-yellow-400 border-yellow-500/40" },
    upcoming: { label: "soon", cls: "text-neutral-400 border-neutral-600/50" },
};

const TYPE_HREF: Record<Reminder["type"], string> = {
    chore: "/chores",
    todo: "/todos",
    event: "/calendar",
    debt: "/debts",
};

function greeting(h: number) {
    if (h < 5) return "Still up";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
}

function money(n: number) {
    return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function shortDate(s: string) {
    return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardPage() {
    const { token, user, isLoading } = useAuth();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !token) return;
        (async () => {
            try {
                const emptyExpenses = { expenses: [], balances: [], settlements: [], summary: { monthTotal: 0, monthCount: 0, byCategory: [] } };
                const [today, reminders, debts, payments, chores, notes, expenses] = await Promise.all([
                    apiFetch<Today>("/api/today", { token }),
                    apiFetch<{ items: Reminder[] }>("/api/reminders", { token }).then((r) => r.items),
                    apiFetch<DebtWithBalance[]>("/api/debts", { token }).catch(() => []),
                    apiFetch<PaymentApi[]>("/api/payments?limit=5", { token }).catch(() => []),
                    apiFetch<ChoreItem[]>("/api/chores", { token }).catch(() => []),
                    apiFetch<HouseholdNote[]>("/api/notes", { token }).catch(() => []),
                    apiFetch<ExpensesResponse>("/api/expenses", { token }).catch(() => emptyExpenses),
                ]);
                setData({ today, reminders, debts, payments, chores, notes, expenses });
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load dashboard");
            }
        })();
    }, [token, isLoading]);

    if (isLoading || (!data && !error)) return <p className="text-neutral-500 font-mono">loading...</p>;
    if (error) return <div className="ascii-error font-mono">[ERROR] {error}</div>;
    if (!data) return null;

    const { today, reminders, debts, payments, chores, notes, expenses } = data;
    const now = new Date();

    const myNet = expenses.balances.find((b) => b.userId === user?.id)?.net ?? 0;

    // Prefer pinned notes; fall back to the latest couple as a peek.
    const pinned = notes.filter((n) => n.pinned);
    const boardPeek = (pinned.length > 0 ? pinned : notes).slice(0, 3);

    const totalOwed = debts.reduce((s, d) => s + d.balance, 0);
    const monthlyInterest = debts.reduce((s, d) => s + (d.balance * d.interestRate) / 1200, 0);
    const myChores = chores
        .filter((c) => !c.isCompletedThisCycle && c.assignedToUserId === user?.id)
        .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
    const recentPayments = [...payments].sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
    );

    return (
        <section className="space-y-6 font-mono">
            {/* HEADER */}
            <div className="flex items-baseline justify-between border-b border-neutral-700 pb-2">
                <h1 className="text-green-400 text-lg font-bold tracking-wider">
                    {greeting(now.getHours())}, {user?.displayName}.
                </h1>
                <span className="text-neutral-500 text-sm">
                    {user?.householdName ? `${user.householdName} · ` : ""}
                    {now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                </span>
            </div>

            {!user?.householdId && (
                <div className="border border-yellow-600/50 bg-yellow-500/5 p-4 text-sm">
                    <span className="text-yellow-400">[!]</span>{" "}
                    <span className="text-neutral-300">
                        You&apos;re not in a household.{" "}
                        <Link href="/household" className="text-green-400 underline">Create or join one</Link>{" "}
                        to share everything with your housemates.
                    </span>
                </div>
            )}

            {/* STAT ROW */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Stat label="chores due" value={today.counts.chores} href="/chores" accent={today.counts.chores > 0} />
                <Stat label="todos due" value={today.counts.todos} href="/todos" accent={today.counts.todos > 0} />
                <Stat label="events" value={today.counts.events} href="/calendar" />
                <Stat label="to buy" value={today.counts.grocery} href="/grocery" />
                <Stat label="owed" value={money(totalOwed)} href="/debts" />
            </div>

            {/* NEEDS ATTENTION */}
            <div className="border border-neutral-800 p-4">
                <div className="flex items-baseline justify-between mb-3">
                    <h2 className="text-neutral-400 text-xs uppercase tracking-widest">needs attention</h2>
                    <Link href="/today" className="text-neutral-600 hover:text-green-400 text-xs">today →</Link>
                </div>
                {reminders.length === 0 ? (
                    <p className="text-neutral-500 text-sm">all clear — nothing due soon. ✓</p>
                ) : (
                    <ul className="space-y-1.5">
                        {reminders.slice(0, 6).map((r, i) => {
                            const sev = SEVERITY[r.severity];
                            return (
                                <li key={`${r.type}-${r.refId}-${i}`}>
                                    <Link href={TYPE_HREF[r.type]} className="flex items-center gap-3 border border-neutral-800 hover:border-neutral-600 px-3 py-2 text-sm">
                                        <span className={`text-[10px] uppercase border px-1.5 py-0.5 shrink-0 ${sev.cls}`}>{sev.label}</span>
                                        <span className="text-neutral-500 text-xs w-10 shrink-0">{r.type}</span>
                                        <span className="text-white flex-1 truncate">{r.title}</span>
                                        <span className="text-neutral-500 text-xs hidden sm:block">{r.detail}</span>
                                    </Link>
                                </li>
                            );
                        })}
                        {reminders.length > 6 && (
                            <li className="text-neutral-600 text-xs pt-1">+{reminders.length - 6} more on the today page</li>
                        )}
                    </ul>
                )}
            </div>

            {/* PINBOARD PEEK */}
            {boardPeek.length > 0 && (
                <div className="border border-neutral-800 p-4">
                    <div className="flex items-baseline justify-between mb-3">
                        <h2 className="text-green-400 text-sm">{"> "}PINBOARD</h2>
                        <Link href="/notes" className="text-neutral-600 hover:text-green-400 text-xs">board →</Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {boardPeek.map((n) => (
                            <div key={n.id} className={`border-l-2 ${NOTE_ACCENT[n.color] ?? NOTE_ACCENT.yellow} bg-neutral-900/40 pl-3 pr-2 py-2`}>
                                <p className="text-neutral-200 text-sm break-words line-clamp-3">{n.pinned && "📌 "}{n.content}</p>
                                <p className="text-neutral-600 text-[11px] mt-1">{n.createdByName ?? "someone"}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* THE LEDGER */}
                <div className="border border-neutral-800 p-4">
                    <h2 className="text-green-400 text-sm mb-3">{"> "}THE LEDGER</h2>
                    {debts.length === 0 ? (
                        <p className="text-neutral-600 text-sm">no debts tracked</p>
                    ) : (
                        <>
                            <table className="w-full text-sm">
                                <tbody>
                                    {debts.map((d) => (
                                        <tr key={d.id} className="border-b border-neutral-800">
                                            <td className="py-1.5 text-neutral-300">{d.name}</td>
                                            <td className="py-1.5 text-right text-white tabular-nums">{money(d.balance)}</td>
                                            <td className="py-1.5 text-right text-neutral-600 text-xs">day {d.dueDay}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="flex justify-between mt-3 pt-2 border-t border-neutral-700 text-sm">
                                <span className="text-neutral-400">owed <span className="text-white font-bold tabular-nums">{money(totalOwed)}</span></span>
                                <span className="text-red-400 tabular-nums">+{money(monthlyInterest)}/mo interest</span>
                            </div>
                        </>
                    )}
                </div>

                {/* YOUR CHORES */}
                <div className="border border-neutral-800 p-4">
                    <h2 className="text-green-400 text-sm mb-3">{"> "}YOUR CHORES</h2>
                    {myChores.length === 0 ? (
                        <p className="text-neutral-600 text-sm">nothing assigned to you right now. nice. ✓</p>
                    ) : (
                        <ul className="space-y-1">
                            {myChores.slice(0, 6).map((c) => {
                                const overdue = new Date(c.nextDueDate) < now;
                                const today = new Date(c.nextDueDate).toDateString() === now.toDateString();
                                return (
                                    <li key={c.id} className="flex items-center justify-between py-1.5 border-b border-neutral-800 text-sm">
                                        <span className="flex items-center gap-2">
                                            <span className="text-white">{c.name}</span>
                                            {c.streak > 1 && <span className="text-orange-400 text-xs">🔥 {c.streak}</span>}
                                        </span>
                                        <span className={overdue ? "text-red-400 text-xs" : today ? "text-yellow-400 text-xs" : "text-neutral-500 text-xs"}>
                                            {overdue ? "overdue" : today ? "today" : shortDate(c.nextDueDate)}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* SPLIT / EXPENSES */}
                <Link href="/expenses" className="border border-neutral-800 hover:border-neutral-600 p-4 flex flex-col">
                    <h2 className="text-green-400 text-sm mb-3">{"> "}SHARED EXPENSES</h2>
                    {myNet > 0 ? (
                        <p className="text-sm text-neutral-300">you&rsquo;re owed <span className="text-green-400 tabular-nums font-bold">{money(myNet)}</span></p>
                    ) : myNet < 0 ? (
                        <p className="text-sm text-neutral-300">you owe <span className="text-red-400 tabular-nums font-bold">{money(-myNet)}</span></p>
                    ) : (
                        <p className="text-sm text-neutral-500">all settled up ✓</p>
                    )}
                    {expenses.settlements.length > 0 && (
                        <p className="text-neutral-600 text-xs mt-2">{expenses.settlements.length} settlement{expenses.settlements.length !== 1 ? "s" : ""} pending</p>
                    )}
                </Link>

                {/* RECENT PAYMENTS */}
                {recentPayments.length > 0 && (
                    <div className="border border-neutral-800 p-4">
                        <h2 className="text-green-400 text-sm mb-3">{"> "}RECENT PAYMENTS</h2>
                        <ul className="space-y-1">
                            {recentPayments.slice(0, 5).map((p) => (
                                <li key={p.id} className="flex items-center justify-between py-1.5 border-b border-neutral-800 text-sm">
                                    <span className="text-neutral-400">{p.debt?.name ?? "payment"}</span>
                                    <span className="flex items-center gap-3">
                                        <span className="text-green-400 tabular-nums">{money(p.amount)}</span>
                                        <span className="text-neutral-600 text-xs">{shortDate(p.paidAt)}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </section>
    );
}

function Stat({ label, value, href, accent = false }: { label: string; value: number | string; href: string; accent?: boolean }) {
    return (
        <Link href={href} className="border border-neutral-800 hover:border-neutral-600 p-3 flex flex-col gap-1">
            <span className={`text-xl font-bold tabular-nums ${accent ? "text-yellow-400" : "text-neutral-300"}`}>{value}</span>
            <span className="text-neutral-500 text-xs">{label}</span>
        </Link>
    );
}
