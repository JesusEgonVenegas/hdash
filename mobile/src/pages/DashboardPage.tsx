import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { todos, grocery, chores, calendar } from "../lib/db";
import type { TodoItem, GroceryItem, ChoreItem, CalendarEvent } from "../lib/db";

function StatCard({ label, value, to, warn }: { label: string; value: string | number; to: string; warn?: boolean }) {
    return (
        <Link to={to}
            className="flex flex-col gap-1 p-3 border border-[var(--color-border)] bg-[var(--color-surface)] active:opacity-80">
            <div className="label">{label}</div>
            <div className="text-2xl font-bold" style={{ color: warn && Number(value) > 0 ? "#fb923c" : "var(--color-accent)" }}>
                {value}
            </div>
        </Link>
    );
}

export function DashboardPage() {
    const [todoList,   setTodoList]   = useState<TodoItem[]>([]);
    const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
    const [choreList,  setChoreList]  = useState<ChoreItem[]>([]);
    const [events,     setEvents]     = useState<CalendarEvent[]>([]);

    useEffect(() => {
        setTodoList(todos.list());
        setGroceryList(grocery.list());
        setChoreList(chores.list());
        const now = new Date();
        const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        setEvents(calendar.list(mk));
    }, []);

    const pending = todoList.filter((t) => !t.isCompleted).length;
    const needed  = groceryList.filter((g) => !g.isChecked).length;
    const due     = choreList.filter((c) => !c.isCompletedThisCycle).length;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = events.filter((e) => {
        const d = new Date(e.startDate); d.setHours(0, 0, 0, 0);
        return d >= today;
    }).slice(0, 3);

    const highPrio = todoList.filter((t) => !t.isCompleted && t.priority === "high").slice(0, 3);
    const overdue  = choreList.filter((c) => !c.isCompletedThisCycle && new Date(c.nextDueDate) < new Date()).slice(0, 3);

    const isEmpty = pending === 0 && needed === 0 && due === 0 && events.length === 0;

    return (
        <div className="pb-6">
            {/* Page title */}
            <div className="page-header">
                <span className="page-title accent-glow">&gt; HDASH</span>
                <span className="text-[10px] text-[var(--color-muted)]">
                    {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
                </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-px bg-[var(--color-border)] mx-4 mt-4">
                <StatCard label="TODOS PENDING"      value={pending}       to="/todos"    />
                <StatCard label="ITEMS NEEDED"       value={needed}        to="/grocery"  />
                <StatCard label="CHORES DUE"         value={due}           to="/chores"   warn />
                <StatCard label="EVENTS THIS MONTH"  value={events.length} to="/calendar" />
            </div>

            {/* High priority todos */}
            {highPrio.length > 0 && (
                <section className="mx-4 mt-5">
                    <div className="label mb-2">⚑ HIGH PRIORITY</div>
                    <div className="border border-[var(--color-border)]">
                        {highPrio.map((t, i) => (
                            <div key={t.id} className={`flex items-center gap-2 px-3 py-2.5 ${i > 0 ? "border-t border-[var(--color-border)]" : ""}`}>
                                <span className="text-red-400 text-xs font-bold">!</span>
                                <span className="text-sm truncate flex-1">{t.title}</span>
                                {t.dueDate && (
                                    <span className="text-[10px] text-[var(--color-muted)] shrink-0">
                                        {new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <Link to="/todos" className="text-[10px] tracking-wider mt-1 block text-right" style={{ color: "var(--color-accent)" }}>
                        SEE ALL →
                    </Link>
                </section>
            )}

            {/* Overdue chores */}
            {overdue.length > 0 && (
                <section className="mx-4 mt-5">
                    <div className="label mb-2">⚠ OVERDUE CHORES</div>
                    <div className="border border-[var(--color-border)]">
                        {overdue.map((c, i) => (
                            <div key={c.id} className={`flex items-center justify-between px-3 py-2.5 ${i > 0 ? "border-t border-[var(--color-border)]" : ""}`}>
                                <span className="text-sm truncate flex-1">{c.name}</span>
                                <span className="text-[10px] text-red-400 ml-2 shrink-0">OVERDUE</span>
                            </div>
                        ))}
                    </div>
                    <Link to="/chores" className="text-[10px] tracking-wider mt-1 block text-right" style={{ color: "var(--color-accent)" }}>
                        SEE ALL →
                    </Link>
                </section>
            )}

            {/* Upcoming events */}
            {upcoming.length > 0 && (
                <section className="mx-4 mt-5">
                    <div className="label mb-2">📅 UPCOMING</div>
                    <div className="border border-[var(--color-border)]">
                        {upcoming.map((e, i) => (
                            <div key={e.id} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? "border-t border-[var(--color-border)]" : ""}`}>
                                <div className={`w-2 h-2 shrink-0 rounded-full bg-${e.color}-400`} />
                                <span className="text-sm truncate flex-1">{e.title}</span>
                                <span className="text-[10px] text-[var(--color-muted)] shrink-0">
                                    {new Date(e.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                            </div>
                        ))}
                    </div>
                    <Link to="/calendar" className="text-[10px] tracking-wider mt-1 block text-right" style={{ color: "var(--color-accent)" }}>
                        SEE ALL →
                    </Link>
                </section>
            )}

            {isEmpty && (
                <div className="empty-state mt-8">
                    <div className="text-2xl opacity-20">_</div>
                    <div className="empty-state-title accent-glow" style={{ color: "var(--color-accent)" }}>ALL CLEAR<span className="blink">_</span></div>
                    <div className="empty-state-hint">Nothing pending. Add items from the tabs below.</div>
                </div>
            )}
        </div>
    );
}
