"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

type Reminder = {
    type: "chore" | "todo" | "event" | "debt";
    severity: "overdue" | "due" | "upcoming";
    title: string;
    detail: string;
    refId: string;
    date: string;
};

type Today = {
    date: string;
    chores: { id: string; name: string; assignedToName?: string; overdue: boolean }[];
    todos: { id: string; title: string; priority: string; overdue: boolean }[];
    events: { id: string; title: string; startDate: string; isAllDay: boolean; color: string }[];
    debtsDue: { id: string; name: string; minPayment: number; balance: number; daysUntilDue: number }[];
    groceryOutstanding: number;
    counts: { chores: number; todos: number; events: number; debtsDue: number; grocery: number };
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

export default function TodayPage() {
    const { token, isLoading, user } = useAuth();
    const [today, setToday] = useState<Today | null>(null);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !token) return;
        (async () => {
            try {
                const [t, r] = await Promise.all([
                    apiFetch<Today>("/api/today", { token }),
                    apiFetch<{ items: Reminder[] }>("/api/reminders", { token }),
                ]);
                setToday(t);
                setReminders(r.items);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load");
            }
        })();
    }, [token, isLoading]);

    if (isLoading || (!today && !error)) {
        return <p className="text-neutral-500 font-mono">loading...</p>;
    }
    if (error) return <p className="text-red-400 font-mono">{error}</p>;
    if (!today) return null;

    const dateLabel = new Date(today.date).toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
    });
    const nothing = reminders.length === 0;

    return (
        <section className="space-y-6 font-mono">
            <header className="flex items-baseline justify-between border-b border-neutral-700 pb-2">
                <h1 className="text-green-400 text-lg font-bold tracking-wider">TODAY</h1>
                <span className="text-neutral-500 text-sm">
                    {user?.displayName ? `${user.displayName} · ` : ""}
                    {dateLabel}
                </span>
            </header>

            {/* Reminders feed — the "what needs attention" list */}
            <div>
                <h2 className="text-neutral-400 text-xs uppercase tracking-widest mb-2">
                    needs attention
                </h2>
                {nothing ? (
                    <p className="text-neutral-500 text-sm border border-neutral-800 p-4">
                        all clear — nothing due in the next few days. ✓
                    </p>
                ) : (
                    <ul className="space-y-1.5">
                        {reminders.map((r, i) => {
                            const sev = SEVERITY[r.severity];
                            return (
                                <li key={`${r.type}-${r.refId}-${i}`}>
                                    <Link
                                        href={TYPE_HREF[r.type]}
                                        className="flex items-center gap-3 border border-neutral-800 hover:border-neutral-600 px-3 py-2 text-sm"
                                    >
                                        <span className={`text-[10px] uppercase border px-1.5 py-0.5 shrink-0 ${sev.cls}`}>
                                            {sev.label}
                                        </span>
                                        <span className="text-neutral-500 text-xs w-12 shrink-0">{r.type}</span>
                                        <span className="text-white flex-1 truncate">{r.title}</span>
                                        <span className="text-neutral-500 text-xs hidden sm:block">{r.detail}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Quick counts across modules */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Stat label="chores due" value={today.counts.chores} href="/chores" accent={today.counts.chores > 0} />
                <Stat label="todos due" value={today.counts.todos} href="/todos" accent={today.counts.todos > 0} />
                <Stat label="events" value={today.counts.events} href="/calendar" />
                <Stat label="debts due" value={today.counts.debtsDue} href="/debts" accent={today.counts.debtsDue > 0} />
                <Stat label="to buy" value={today.counts.grocery} href="/grocery" />
            </div>
        </section>
    );
}

function Stat({
    label,
    value,
    href,
    accent = false,
}: {
    label: string;
    value: number;
    href: string;
    accent?: boolean;
}) {
    return (
        <Link
            href={href}
            className="border border-neutral-800 hover:border-neutral-600 p-3 flex flex-col gap-1"
        >
            <span className={`text-2xl font-bold ${accent ? "text-yellow-400" : "text-neutral-300"}`}>
                {value}
            </span>
            <span className="text-neutral-500 text-xs">{label}</span>
        </Link>
    );
}
