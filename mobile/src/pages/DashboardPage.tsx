import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { todos, grocery, chores, calendar } from "../lib/db";
import type { TodoItem, GroceryItem, ChoreItem, CalendarEvent } from "../lib/db";

function PageHeader({ title }: { title: string }) {
    return (
        <div className="px-4 pt-4 pb-2 border-b border-neutral-800">
            <span className="text-green-400 font-bold tracking-widest text-sm">&gt; {title}</span>
        </div>
    );
}

function StatCard({ label, value, to }: { label: string; value: string | number; to: string }) {
    return (
        <Link to={to} className="block border border-neutral-800 bg-[#111] p-3 active:bg-neutral-900 transition-colors">
            <div className="text-neutral-500 text-[10px] tracking-widest mb-1">{label}</div>
            <div className="text-green-400 font-bold text-xl">{value}</div>
        </Link>
    );
}

export function DashboardPage() {
    const [todoList, setTodoList] = useState<TodoItem[]>([]);
    const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
    const [choreList, setChoreList] = useState<ChoreItem[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);

    useEffect(() => {
        setTodoList(todos.list());
        setGroceryList(grocery.list());
        setChoreList(chores.list());

        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        setEvents(calendar.list(monthKey));
    }, []);

    const pending = todoList.filter((t) => !t.isCompleted).length;
    const needed = groceryList.filter((g) => !g.isChecked).length;
    const due = choreList.filter((c) => !c.isCompletedThisCycle).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = events.filter((e) => {
        const d = new Date(e.startDate);
        d.setHours(0, 0, 0, 0);
        return d >= today;
    }).slice(0, 3);

    const highPrio = todoList.filter((t) => !t.isCompleted && t.priority === "high").slice(0, 3);
    const dueSoon = choreList.filter((c) => !c.isCompletedThisCycle).slice(0, 3);

    return (
        <div className="pb-4">
            <PageHeader title="DASHBOARD" />

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-px bg-neutral-800 mx-4 mt-4">
                <StatCard label="TODOS PENDING" value={pending} to="/todos" />
                <StatCard label="ITEMS NEEDED" value={needed} to="/grocery" />
                <StatCard label="CHORES DUE" value={due} to="/chores" />
                <StatCard label="EVENTS THIS MONTH" value={events.length} to="/calendar" />
            </div>

            {/* High priority todos */}
            {highPrio.length > 0 && (
                <section className="mx-4 mt-4">
                    <div className="text-[10px] text-neutral-500 tracking-widest mb-2">HIGH PRIORITY</div>
                    <div className="border border-neutral-800">
                        {highPrio.map((t, i) => (
                            <div key={t.id} className={`flex items-center gap-2 px-3 py-2 ${i > 0 ? "border-t border-neutral-800" : ""}`}>
                                <span className="text-red-400 text-xs">!</span>
                                <span className="text-sm text-neutral-200 truncate">{t.title}</span>
                            </div>
                        ))}
                    </div>
                    <Link to="/todos" className="text-[10px] text-green-400 tracking-wider mt-1 block text-right">SEE ALL →</Link>
                </section>
            )}

            {/* Chores due soon */}
            {dueSoon.length > 0 && (
                <section className="mx-4 mt-4">
                    <div className="text-[10px] text-neutral-500 tracking-widest mb-2">CHORES DUE</div>
                    <div className="border border-neutral-800">
                        {dueSoon.map((c, i) => (
                            <div key={c.id} className={`flex items-center justify-between px-3 py-2 ${i > 0 ? "border-t border-neutral-800" : ""}`}>
                                <span className="text-sm text-neutral-200 truncate">{c.name}</span>
                                <span className="text-[10px] text-neutral-500 ml-2 shrink-0">{c.frequency.toUpperCase()}</span>
                            </div>
                        ))}
                    </div>
                    <Link to="/chores" className="text-[10px] text-green-400 tracking-wider mt-1 block text-right">SEE ALL →</Link>
                </section>
            )}

            {/* Upcoming events */}
            {upcoming.length > 0 && (
                <section className="mx-4 mt-4">
                    <div className="text-[10px] text-neutral-500 tracking-widest mb-2">UPCOMING EVENTS</div>
                    <div className="border border-neutral-800">
                        {upcoming.map((e, i) => (
                            <div key={e.id} className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? "border-t border-neutral-800" : ""}`}>
                                <div className={`w-2 h-2 shrink-0 rounded-full bg-${e.color}-400`} />
                                <span className="text-sm text-neutral-200 truncate">{e.title}</span>
                                <span className="text-[10px] text-neutral-500 ml-auto shrink-0">
                                    {new Date(e.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                            </div>
                        ))}
                    </div>
                    <Link to="/calendar" className="text-[10px] text-green-400 tracking-wider mt-1 block text-right">SEE ALL →</Link>
                </section>
            )}

            {pending === 0 && needed === 0 && due === 0 && events.length === 0 && (
                <div className="mx-4 mt-8 border border-neutral-800 px-4 py-6 text-center">
                    <div className="text-green-400 text-sm mb-1">ALL CLEAR</div>
                    <div className="text-neutral-500 text-xs">No pending items. Add some from the tabs below.</div>
                </div>
            )}
        </div>
    );
}
