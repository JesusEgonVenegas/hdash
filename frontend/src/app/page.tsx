"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { TodoItem } from "@/types/todo";
import type { ChoreItem } from "@/types/chore";
import type { GroceryItem } from "@/types/grocery";
import type { CalendarEvent } from "@/types/calendar";
import type { Debt } from "@/types/debt";
import type { PaymentApi } from "@/types/payment";

// ─── Landing page shown to unauthenticated visitors ───────────────────────────

const FEATURES = [
    { label: "grocery list",  desc: "shared list with check-off, quantities, and one-tap clear" },
    { label: "todos",         desc: "priority levels, due dates, household assignment, inline editing" },
    { label: "chores",        desc: "recurring rotation — auto-advances to the next person on completion" },
    { label: "calendar",      desc: "monthly grid, color-coded events, full add/edit/delete" },
    { label: "debt tracker",  desc: "vim-style spreadsheet with keyboard nav (j/k/h/l/i/dd)" },
    { label: "payments",      desc: "log payments against debts and track history" },
    { label: "dashboard",     desc: "one view: overdue items, upcoming events, debt summary" },
];

function LandingPage() {
    const [tick, setTick] = useState(true);

    useEffect(() => {
        const id = setInterval(() => setTick((t) => !t), 600);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="space-y-16 py-4">
            {/* HERO */}
            <section className="space-y-6">
                <div className="border border-neutral-700 p-6 sm:p-10">
                    <div className="text-green-400 text-xs mb-4 tracking-widest">HDASH v1.0</div>
                    <h1 className="text-2xl sm:text-4xl text-white font-bold leading-tight mb-4">
                        <span className="text-green-400">&gt; </span>
                        household management<br />
                        <span className="text-neutral-400">for people who hate</span><br />
                        bloated apps
                        <span className={`text-green-400 ml-1 ${tick ? "opacity-100" : "opacity-0"}`}>_</span>
                    </h1>
                    <p className="text-neutral-400 text-sm sm:text-base max-w-xl leading-relaxed">
                        One dashboard for your whole household. Grocery lists, chore rotations,
                        shared todos, a calendar, and debt tracking — all in a terminal UI that
                        stays out of your way.
                    </p>
                    <div className="flex flex-wrap gap-3 mt-8">
                        <Link
                            href="/register"
                            className="border border-green-400 px-6 py-2.5 text-green-400 hover:bg-green-400/10 transition-colors text-sm"
                        >
                            [ get started ]
                        </Link>
                        <Link
                            href="/login"
                            className="border border-neutral-700 px-6 py-2.5 text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors text-sm"
                        >
                            sign in
                        </Link>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="space-y-3">
                <div className="text-xs text-neutral-500 tracking-widest mb-4">FEATURES</div>
                <div className="border border-neutral-700 divide-y divide-neutral-800">
                    {FEATURES.map((f) => (
                        <div key={f.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 px-5 py-3">
                            <span className="text-green-400 text-sm w-32 flex-shrink-0">
                                &gt; {f.label}
                            </span>
                            <span className="text-neutral-400 text-sm">{f.desc}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="space-y-3">
                <div className="text-xs text-neutral-500 tracking-widest mb-4">HOW IT WORKS</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { step: "01", title: "create an account", body: "Register with an email and password. Takes 10 seconds." },
                        { step: "02", title: "create a household", body: "Name your household and share the invite code with housemates." },
                        { step: "03", title: "run your house", body: "Add groceries, assign chores, track shared todos and events." },
                    ].map((s) => (
                        <div key={s.step} className="border border-neutral-700 p-5">
                            <div className="text-green-400/40 text-2xl font-bold mb-2">{s.step}</div>
                            <div className="text-white text-sm font-bold mb-1">{s.title}</div>
                            <div className="text-neutral-500 text-xs leading-relaxed">{s.body}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SELF-HOSTABLE CALLOUT */}
            <section>
                <div className="border border-neutral-700 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-neutral-300 text-sm font-bold mb-1">self-hostable with Docker</div>
                        <div className="text-neutral-500 text-xs">
                            Your data stays on your server. One{" "}
                            <code className="text-green-400">docker compose up</code> and you&apos;re running.
                        </div>
                    </div>
                    <a
                        href="https://github.com/JesusEgonVenegas/hdash"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-neutral-700 px-5 py-2 text-xs text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors whitespace-nowrap"
                    >
                        view on github →
                    </a>
                </div>
            </section>

            {/* FOOTER CTA */}
            <section className="border-t border-neutral-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-neutral-600 text-xs">HDASH — open source household dashboard</span>
                <div className="flex gap-3">
                    <Link href="/register" className="text-green-400 text-sm hover:underline">
                        get started →
                    </Link>
                </div>
            </section>
        </div>
    );
}

// ─── Dashboard shown to authenticated users ───────────────────────────────────

interface DashboardData {
    debts: Debt[];
    payments: PaymentApi[];
    todos: TodoItem[];
    chores: ChoreItem[];
    grocery: GroceryItem[];
    calendar: CalendarEvent[];
}

function formatDate(dateString: string) {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(d);
}

function Dashboard() {
    const { token, user } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        async function load() {
            try {
                const now = new Date();
                const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

                const [debts, payments, todos, chores, grocery, calendar] = await Promise.all([
                    apiFetch<Debt[]>("/api/debts", { token: token! }),
                    apiFetch<PaymentApi[]>("/api/payments?limit=5", { token: token! }),
                    apiFetch<TodoItem[]>("/api/todos", { token: token! }).catch(() => [] as TodoItem[]),
                    apiFetch<ChoreItem[]>("/api/chores", { token: token! }).catch(() => [] as ChoreItem[]),
                    apiFetch<GroceryItem[]>("/api/grocery", { token: token! }).catch(() => [] as GroceryItem[]),
                    apiFetch<CalendarEvent[]>(`/api/calendar?month=${monthKey}`, { token: token! }).catch(() => [] as CalendarEvent[]),
                ]);
                setData({ debts, payments, todos, chores, grocery, calendar });
            } catch (err: any) {
                setError(err.message ?? "Failed to load dashboard");
            }
        }

        load();
    }, [token]);

    if (!data) {
        return (
            <section className="space-y-6">
                <div className="border border-neutral-700 p-4">
                    <h1 className="text-lg text-green-400">{"> "}DASHBOARD</h1>
                </div>
                {error ? (
                    <div className="ascii-error">[ERROR] {error}</div>
                ) : (
                    <p className="text-neutral-500 text-sm">loading...</p>
                )}
            </section>
        );
    }

    const { debts, payments, todos, chores, grocery, calendar } = data;

    const totalDebt = debts.reduce((sum, d) => sum + d.startingAmount, 0);
    const now = Date.now();
    const last30Days = payments.filter(
        (p) => now - new Date(p.paidAt).getTime() <= 30 * 24 * 60 * 60 * 1000
    );
    const totalPaid30 = last30Days.reduce((sum, p) => sum + p.amount, 0);

    const pendingTodos = todos.filter((t) => !t.isCompleted);
    const overdueTodos = pendingTodos.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
    const dueChores = chores.filter((c) => !c.isCompletedThisCycle);
    const overdueChores = dueChores.filter((c) => new Date(c.nextDueDate) < new Date());
    const myChores = dueChores.filter((c) => c.assignedToUserId === user?.id);
    const uncheckedGrocery = grocery.filter((g) => !g.isChecked);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(todayStart);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const upcomingEvents = calendar
        .filter((e) => new Date(e.startDate) >= todayStart && new Date(e.startDate) <= weekFromNow)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 5);

    return (
        <section className="space-y-6">
            <div className="border border-neutral-700 p-4">
                <h1 className="text-lg text-green-400">{"> "}DASHBOARD</h1>
                <p className="text-neutral-500 text-xs mt-1">
                    {user?.householdName ? `household: ${user.householdName}` : "personal overview"}
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
                        to share lists and chores with housemates.
                    </span>
                </div>
            )}

            {/* QUICK STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            {/* NEEDS ATTENTION */}
            {(overdueTodos.length > 0 || overdueChores.length > 0) && (
                <div className="border border-red-500/30 bg-red-500/5 p-4">
                    <h2 className="text-sm text-red-400 mb-3">{"> "}NEEDS ATTENTION</h2>
                    <div className="space-y-1">
                        {overdueTodos.map((t) => (
                            <div key={t.id} className="flex justify-between py-1 border-b border-neutral-800 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-red-400 text-xs">[TODO]</span>
                                    <span className="text-white">{t.title}</span>
                                </div>
                                <span className="text-red-400 text-xs">overdue {t.dueDate ? formatDate(t.dueDate) : ""}</span>
                            </div>
                        ))}
                        {overdueChores.map((c) => (
                            <div key={c.id} className="flex justify-between py-1 border-b border-neutral-800 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-red-400 text-xs">[CHORE]</span>
                                    <span className="text-white">{c.name}</span>
                                    {c.assignedToUserId === user?.id && (
                                        <span className="text-green-400 text-xs">» your turn</span>
                                    )}
                                </div>
                                <span className="text-red-400 text-xs">overdue {formatDate(c.nextDueDate)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* DETAIL GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myChores.length > 0 && (
                    <div className="border border-neutral-700 p-4">
                        <h2 className="text-sm text-green-400 mb-3">{"> "}YOUR CHORES</h2>
                        <div className="space-y-1">
                            {myChores.slice(0, 5).map((c) => (
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

                <div className="border border-neutral-700 p-4">
                    <h2 className="text-sm text-green-400 mb-3">{"> "}UPCOMING EVENTS</h2>
                    {upcomingEvents.length === 0 ? (
                        <p className="text-neutral-600 text-sm">no events this week</p>
                    ) : (
                        <div className="space-y-1">
                            {upcomingEvents.map((e) => (
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
                                    <span className="text-neutral-500 text-xs">{formatDate(e.startDate)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

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
                                    <div key={p.id} className="flex justify-between py-1.5 border-b border-neutral-800 text-sm">
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

// ─── Root page — landing for visitors, dashboard for members ─────────────────

export default function RootPage() {
    const { token, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <span className="text-neutral-600 text-sm">loading...</span>
            </div>
        );
    }

    return token ? <Dashboard /> : <LandingPage />;
}
