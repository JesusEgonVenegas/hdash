import { useEffect, useState } from "react";
import { todos, grocery, chores, notes, budget } from "../lib/db";
import type { TodoItem, ChoreItem, BudgetCategory } from "../lib/db";

function StatBlock({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="flex flex-col gap-0.5 p-3 border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="label">{label}</div>
            <div className="text-xl font-bold" style={{ color: "var(--color-accent)" }}>{value}</div>
            {sub && <div className="text-[9px] text-[var(--color-muted)]">{sub}</div>}
        </div>
    );
}

function MiniBar({ pct, over }: { pct: number; over?: boolean }) {
    return (
        <div className="progress-track flex-1">
            <div className={`progress-fill ${over ? "over" : ""}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
    );
}

function fmt(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function StatsPage() {
    const [todoList,   setTodoList]   = useState<TodoItem[]>([]);
    const [choreList,  setChoreList]  = useState<ChoreItem[]>([]);
    const [budgetList, setBudgetList] = useState<BudgetCategory[]>([]);
    const [noteCount,  setNoteCount]  = useState(0);
    const [grocCount,  setGrocCount]  = useState(0);

    useEffect(() => {
        setTodoList(todos.list());
        setChoreList(chores.list());
        const now = new Date();
        const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        setBudgetList(budget.listMonth(mk));
        setNoteCount(notes.list().length);
        setGrocCount(grocery.list().filter((g) => !g.isChecked).length);
    }, []);

    // Todo stats
    const todoTotal     = todoList.length;
    const todoCompleted = todoList.filter((t) => t.isCompleted).length;
    const todoPct       = todoTotal > 0 ? Math.round((todoCompleted / todoTotal) * 100) : 0;
    const highCount     = todoList.filter((t) => t.priority === "high" && !t.isCompleted).length;

    // Chore stats
    const choreTotal    = choreList.length;
    const choreDone     = choreList.filter((c) => c.isCompletedThisCycle).length;
    const choreOverdue  = choreList.filter((c) => !c.isCompletedThisCycle && new Date(c.nextDueDate) < new Date()).length;

    // Budget stats
    const budgetTotal = budgetList.reduce((s, b) => s + b.limit, 0);
    const budgetSpent = budgetList.reduce((s, b) => s + b.spent, 0);
    const budgetPct   = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0;
    const overBudget  = budgetSpent > budgetTotal;

    // Productivity score 0-100
    const score = Math.round(
        (todoTotal > 0 ? (todoCompleted / todoTotal) * 40 : 40) +
        (choreTotal > 0 ? (choreDone / choreTotal) * 40 : 40) +
        (budgetTotal > 0 && !overBudget ? 20 : budgetTotal === 0 ? 20 : 0)
    );
    const scoreLabel = score >= 80 ? "EXCELLENT" : score >= 60 ? "GOOD" : score >= 40 ? "FAIR" : "NEEDS WORK";

    return (
        <div className="pb-6">
            <div className="page-header">
                <span className="page-title">&gt; STATS</span>
                <span className="text-[10px] text-[var(--color-muted)]">
                    {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
                </span>
            </div>

            {/* Productivity score */}
            <div className="mx-4 mt-4 border border-[var(--color-border)] p-4 flex items-center gap-4">
                <div className="text-4xl font-bold" style={{ color: "var(--color-accent)" }}>{score}</div>
                <div>
                    <div className="text-xs font-bold tracking-widest" style={{ color: "var(--color-accent)" }}>
                        {scoreLabel}
                    </div>
                    <div className="label mt-0.5">PRODUCTIVITY SCORE</div>
                    <div className="text-[9px] text-[var(--color-muted)] mt-1">Based on todos, chores, and budget</div>
                </div>
            </div>

            {/* Overview grid */}
            <div className="grid grid-cols-2 gap-px bg-[var(--color-border)] mx-4 mt-4">
                <StatBlock label="TODOS DONE" value={`${todoCompleted}/${todoTotal}`} sub={`${todoPct}% complete`} />
                <StatBlock label="CHORES DONE" value={`${choreDone}/${choreTotal}`} sub={choreOverdue > 0 ? `${choreOverdue} overdue` : "on track"} />
                <StatBlock label="GROCERY ITEMS" value={grocCount} sub="still needed" />
                <StatBlock label="NOTES" value={noteCount} sub="saved" />
            </div>

            {/* Todos breakdown */}
            {todoTotal > 0 && (
                <section className="mx-4 mt-5">
                    <div className="label mb-2">TODOS</div>
                    <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                        <div className="flex items-center gap-3 px-3 py-2.5">
                            <span className="text-xs text-[var(--color-muted)] w-20">COMPLETION</span>
                            <MiniBar pct={todoPct} />
                            <span className="text-xs" style={{ color: "var(--color-accent)" }}>{todoPct}%</span>
                        </div>
                        {highCount > 0 && (
                            <div className="flex items-center justify-between px-3 py-2">
                                <span className="text-xs text-[var(--color-muted)]">HIGH PRIORITY PENDING</span>
                                <span className="text-xs text-red-400 font-bold">{highCount}</span>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Budget breakdown */}
            {budgetList.length > 0 && (
                <section className="mx-4 mt-5">
                    <div className="label mb-2">BUDGET THIS MONTH</div>
                    <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                        <div className="flex items-center gap-3 px-3 py-2.5">
                            <span className="text-xs text-[var(--color-muted)] w-20">OVERALL</span>
                            <MiniBar pct={budgetPct} over={overBudget} />
                            <span className={`text-xs ${overBudget ? "text-red-400" : ""}`}
                                style={!overBudget ? { color: "var(--color-accent)" } : undefined}>
                                {fmt(budgetSpent)}/{fmt(budgetTotal)}
                            </span>
                        </div>
                        {budgetList.map((cat) => {
                            const pct = cat.limit > 0 ? (cat.spent / cat.limit) * 100 : 0;
                            return (
                                <div key={cat.id} className="flex items-center gap-3 px-3 py-2">
                                    <span className="text-xs text-[var(--color-muted)] w-20 truncate">{cat.emoji} {cat.name}</span>
                                    <MiniBar pct={pct} over={cat.spent > cat.limit} />
                                    <span className="text-[10px] text-[var(--color-muted)]">{Math.round(pct)}%</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Chores breakdown */}
            {choreTotal > 0 && (
                <section className="mx-4 mt-5">
                    <div className="label mb-2">CHORES</div>
                    <div className="border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                        {["daily","weekly","biweekly","monthly"].map((freq) => {
                            const subset = choreList.filter((c) => c.frequency === freq);
                            if (subset.length === 0) return null;
                            const done = subset.filter((c) => c.isCompletedThisCycle).length;
                            return (
                                <div key={freq} className="flex items-center gap-3 px-3 py-2.5">
                                    <span className="text-xs text-[var(--color-muted)] w-20">{freq.toUpperCase()}</span>
                                    <MiniBar pct={(done / subset.length) * 100} />
                                    <span className="text-[10px] text-[var(--color-muted)]">{done}/{subset.length}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
