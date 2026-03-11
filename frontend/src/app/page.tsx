"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { TodoItem } from "@/types/todo";
import type { ChoreItem } from "@/types/chore";
import type { GroceryItem } from "@/types/grocery";
import type { CalendarEvent } from "@/types/calendar";

interface DashboardData {
    debts: any[];
    payments: any[];
    todos: TodoItem[];
    chores: ChoreItem[];
    grocery: GroceryItem[];
    calendar: CalendarEvent[];
}

function formatDate(dateString: string) {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
    }).format(d);
}

export default function DashboardPage() {
    const { token, user, isLoading } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !token) return;

        async function load() {
            try {
                const now = new Date();
                const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

                const [debts, payments, todos, chores, grocery, calendar] = await Promise.all([
                    apiFetch<any[]>("/api/debts", { token }),
                    apiFetch<any[]>("/api/payments?limit=5", { token }),
                    apiFetch<TodoItem[]>("/api/todos", { token }).catch(() => [] as TodoItem[]),
                    apiFetch<ChoreItem[]>("/api/chores", { token }).catch(() => [] as ChoreItem[]),
                    apiFetch<GroceryItem[]>("/api/grocery", { token }).catch(() => [] as GroceryItem[]),
                    apiFetch<CalendarEvent[]>(`/api/calendar?month=${monthKey}`, { token }).catch(() => [] as CalendarEvent[]),
                ]);
                setData({ debts, payments, todos, chores, grocery, calendar });
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

    const { debts, payments, todos, chores, grocery, calendar } = data;

    // Debt stats
    const totalDebt = debts.reduce((sum, d) => sum + d.startingAmount, 0);
    const now = Date.now();
    const last30Days = payments.filter(
        (p) => now - new Date(p.paidAt).getTime() <= 30 * 24 * 60 * 60 * 1000
    );
    const totalPaid30 = last30Days.reduce((sum, p) => sum + p.amount, 0);

    // Todo stats
    const pendingTodos = todos.filter(t => !t.isCompleted);
    const overdueTodos = pendingTodos.filter(t =>
        t.dueDate && new Date(t.dueDate) < new Date()
    );

    // Chore stats
    const dueChores = chores.filter(c => !c.isCompletedThisCycle);
    const overdueChores = dueChores.filter(c =>
        new Date(c.nextDueDate) < new Date()
    );
    const myChores = dueChores.filter(c => c.assignedToUserId === user?.id);

    // Grocery stats
    const uncheckedGrocery = grocery.filter(g => !g.isChecked);

    // Calendar — upcoming events (next 7 days)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(todayStart);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const upcomingEvents = calendar
        .filter(e => new Date(e.startDate) >= todayStart && new Date(e.startDate) <= weekFromNow)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 5);

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

            {/* QUICK STATS ROW */}
            <div className="grid grid-cols-4 gap-4">
                <Link href="/todos" className="border border-neutral-700 p-4 hover:border-neutral-600 transition-colors">
                    <div className="text-neutral-500 text-xs mb-1">TODOS</div>
                    <div className="text-xl text-white">{pendingTodos.length}</div>
                    {overdueTodos.length > 0 && (
                        <div className="text-red-400 text-xs mt-1">{overdueTodos.length} overdue</div>
                    )}
                </Link>
                <Link href="/chores" className="border border-neutral-700 p-4 hover:border-neutral-600 transition-colors">
                    <div className="text-neutral-500 text-xs mb-1">CHORES DUE</div>
                    <div className="text-xl text-white">{dueChores.length}</div>
                    {myChores.length > 0 && (
                        <div className="text-green-400 text-xs mt-1">{myChores.length} yours</div>
                    )}
                </Link>
                <Link href="/grocery" className="border border-neutral-700 p-4 hover:border-neutral-600 transition-colors">
                    <div className="text-neutral-500 text-xs mb-1">GROCERY</div>
                    <div className="text-xl text-white">{uncheckedGrocery.length}</div>
                    <div className="text-neutral-600 text-xs mt-1">to buy</div>
                </Link>
                <Link href="/debts" className="border border-neutral-700 p-4 hover:border-neutral-600 transition-colors">
                    <div className="text-neutral-500 text-xs mb-1">TOTAL DEBT</div>
                    <div className="text-xl text-blue-400">${totalDebt.toLocaleString()}</div>
                    {totalPaid30 > 0 && (
                        <div className="text-green-400 text-xs mt-1">${totalPaid30.toFixed(0)} paid (30d)</div>
                    )}
                </Link>
            </div>

            {/* ACTION ITEMS */}
            {(overdueTodos.length > 0 || overdueChores.length > 0) && (
                <div className="border border-red-500/30 bg-red-500/5 p-4">
                    <h2 className="text-sm text-red-400 mb-3">{"> "}NEEDS ATTENTION</h2>
                    <div className="space-y-1">
                        {overdueTodos.map(t => (
                            <div key={t.id} className="flex justify-between py-1 border-b border-neutral-800 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-red-400 text-xs">[TODO]</span>
                                    <span className="text-white">{t.title}</span>
                                </div>
                                <span className="text-red-400 text-xs">
                                    overdue {t.dueDate ? formatDate(t.dueDate) : ""}
                                </span>
                            </div>
                        ))}
                        {overdueChores.map(c => (
                            <div key={c.id} className="flex justify-between py-1 border-b border-neutral-800 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-red-400 text-xs">[CHORE]</span>
                                    <span className="text-white">{c.name}</span>
                                    {c.assignedToUserId === user?.id && (
                                        <span className="text-green-400 text-xs">» your turn</span>
                                    )}
                                </div>
                                <span className="text-red-400 text-xs">
                                    overdue {formatDate(c.nextDueDate)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                {/* YOUR CHORES */}
                {myChores.length > 0 && (
                    <div className="border border-neutral-700 p-4">
                        <h2 className="text-sm text-green-400 mb-3">{"> "}YOUR CHORES</h2>
                        <div className="space-y-1">
                            {myChores.slice(0, 5).map(c => (
                                <div key={c.id} className="flex justify-between py-1.5 border-b border-neutral-800 text-sm">
                                    <span className="text-white">{c.name}</span>
                                    <span className="text-neutral-500 text-xs">
                                        {new Date(c.nextDueDate).toDateString() === new Date().toDateString()
                                            ? "today"
                                            : formatDate(c.nextDueDate)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* UPCOMING EVENTS */}
                <div className="border border-neutral-700 p-4">
                    <h2 className="text-sm text-green-400 mb-3">{"> "}UPCOMING EVENTS</h2>
                    {upcomingEvents.length === 0 ? (
                        <p className="text-neutral-600 text-sm">no events this week</p>
                    ) : (
                        <div className="space-y-1">
                            {upcomingEvents.map(e => (
                                <div key={e.id} className="flex justify-between py-1.5 border-b border-neutral-800 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            e.color === "blue" ? "bg-blue-400" :
                                            e.color === "red" ? "bg-red-400" :
                                            e.color === "yellow" ? "bg-yellow-400" :
                                            e.color === "purple" ? "bg-purple-400" :
                                            "bg-green-400"
                                        }`} />
                                        <span className="text-white">{e.title}</span>
                                    </div>
                                    <span className="text-neutral-500 text-xs">
                                        {formatDate(e.startDate)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* UPCOMING DUE DATES */}
                <div className="border border-neutral-700 p-4">
                    <h2 className="text-sm text-green-400 mb-3">{"> "}DEBT DUE DATES</h2>
                    {debts.length === 0 ? (
                        <p className="text-neutral-600 text-sm">no debts tracked</p>
                    ) : (
                        <div className="space-y-1">
                            {[...debts]
                                .sort((a, b) => a.dueDay - b.dueDay)
                                .slice(0, 4)
                                .map((d) => (
                                    <div key={d.id} className="flex justify-between py-1.5 border-b border-neutral-800 text-sm">
                                        <span className="text-neutral-300">{d.name}</span>
                                        <span className="text-neutral-500">day {d.dueDay}</span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                {/* RECENT PAYMENTS */}
                <div className="border border-neutral-700 p-4">
                    <h2 className="text-sm text-green-400 mb-3">{"> "}RECENT PAYMENTS</h2>
                    {payments.length === 0 ? (
                        <p className="text-neutral-600 text-sm">no payments recorded</p>
                    ) : (
                        <div className="space-y-1">
                            {[...payments]
                                .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
                                .slice(0, 4)
                                .map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex justify-between py-1.5 border-b border-neutral-800 text-sm"
                                    >
                                        <span className="text-green-400">${p.amount}</span>
                                        <span className="text-neutral-500">{formatDate(p.paidAt)}</span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
