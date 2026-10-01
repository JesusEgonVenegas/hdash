import { useState, useEffect } from "react";
import { budget } from "../lib/db";
import type { BudgetCategory } from "../lib/db";

const EMOJIS = ["🛒", "🍔", "🚗", "💊", "🎉", "🏠", "⚡", "💻", "🎵", "👗", "📚", "🐾"];

function pad2(n: number) { return String(n).padStart(2, "0"); }

function monthLabel(key: string): string {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1).toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase();
}

function fmt(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Add Category Form ────────────────────────────────────────────────────────

function AddCategoryBar({ month, onAdd }: { month: string; onAdd: () => void }) {
    const [open,  setOpen]  = useState(false);
    const [name,  setName]  = useState("");
    const [limit, setLimit] = useState("");
    const [emoji, setEmoji] = useState("🛒");

    function submit() {
        if (!name.trim() || !limit) return;
        budget.add(name.trim(), parseFloat(limit), emoji, month);
        setName(""); setLimit(""); setEmoji("🛒");
        setOpen(false);
        onAdd();
    }

    if (!open) {
        return (
            <button onClick={() => setOpen(true)}
                className="w-full border-b border-[var(--color-border)] px-4 py-3 text-left text-xs tracking-widest active:bg-neutral-900"
                style={{ color: "var(--color-accent)" }}>
                + ADD CATEGORY
            </button>
        );
    }

    return (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex flex-col gap-2">
            <div className="flex gap-2">
                {/* emoji picker */}
                <select
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="input-field w-14 text-center px-1"
                >
                    {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <input value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Category name"
                    className="input-field flex-1" />
            </div>
            <input value={limit} onChange={(e) => setLimit(e.target.value)}
                type="number" min="0" placeholder="Monthly limit ($)"
                className="input-field" />
            <div className="flex gap-2">
                <button onClick={submit} className="btn-primary flex-1">SAVE</button>
                <button onClick={() => setOpen(false)} className="btn-ghost flex-1">CANCEL</button>
            </div>
        </div>
    );
}

// ─── Spend Modal ──────────────────────────────────────────────────────────────

function SpendModal({ cat, onClose, onSave }: {
    cat: BudgetCategory;
    onClose: () => void;
    onSave: (amount: number) => void;
}) {
    const [amount, setAmount] = useState("");

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
            <div className="bg-[#111] border-t border-[var(--color-border)] w-full p-4 flex flex-col gap-3">
                <div className="text-xs tracking-widest text-[var(--color-muted)]">
                    LOG SPENDING — {cat.emoji} {cat.name.toUpperCase()}
                </div>
                <input
                    autoFocus
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount ($)"
                    className="input-field text-lg"
                />
                <div className="flex gap-2">
                    <button onClick={() => { const n = parseFloat(amount); if (n > 0) onSave(n); }}
                        className="btn-primary flex-1">ADD</button>
                    <button onClick={onClose} className="btn-ghost flex-1">CANCEL</button>
                </div>
            </div>
        </div>
    );
}

// ─── Category Row ─────────────────────────────────────────────────────────────

function CategoryRow({ cat, onSpend, onDelete }: {
    cat: BudgetCategory;
    onSpend: () => void;
    onDelete: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const pct = cat.limit > 0 ? Math.min((cat.spent / cat.limit) * 100, 100) : 0;
    const over = cat.spent > cat.limit;
    const remaining = cat.limit - cat.spent;

    return (
        <div className="border-b border-[var(--color-border)] last:border-0">
            <div className="list-row" onClick={() => setExpanded((v) => !v)}>
                <span className="text-xl">{cat.emoji ?? "📁"}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm truncate">{cat.name}</span>
                        <span className={`text-xs font-bold ml-2 shrink-0 ${over ? "text-red-400" : ""}`}
                            style={!over ? { color: "var(--color-accent)" } : undefined}>
                            {fmt(cat.spent)} / {fmt(cat.limit)}
                        </span>
                    </div>
                    <div className="progress-track">
                        <div className={`progress-fill ${over ? "over" : ""}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-[var(--color-muted)]">{pct.toFixed(0)}% used</span>
                        <span className={`text-[9px] ${over ? "text-red-400" : "text-[var(--color-muted)]"}`}>
                            {over ? `${fmt(Math.abs(remaining))} OVER` : `${fmt(remaining)} left`}
                        </span>
                    </div>
                </div>
            </div>
            {expanded && (
                <div className="flex border-t border-[var(--color-border)]">
                    <button onClick={onSpend}
                        className="flex-1 py-2 text-[10px] tracking-wider border-r border-[var(--color-border)] active:bg-neutral-900"
                        style={{ color: "var(--color-accent)" }}>
                        + SPEND
                    </button>
                    <button onClick={onDelete}
                        className="flex-1 py-2 text-[10px] tracking-wider text-red-400 active:bg-neutral-900">
                        DELETE
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BudgetPage() {
    const now = new Date();
    const [month, setMonth] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);
    const [list,  setList]  = useState<BudgetCategory[]>([]);
    const [spending, setSpending] = useState<BudgetCategory | null>(null);

    function refresh() { setList(budget.listMonth(month)); }
    useEffect(refresh, [month]);

    function prevMonth() {
        const [y, m] = month.split("-").map(Number);
        if (m === 1) setMonth(`${y - 1}-12`);
        else setMonth(`${y}-${pad2(m - 1)}`);
    }
    function nextMonth() {
        const [y, m] = month.split("-").map(Number);
        if (m === 12) setMonth(`${y + 1}-01`);
        else setMonth(`${y}-${pad2(m + 1)}`);
    }

    const totalBudget = list.reduce((s, c) => s + c.limit, 0);
    const totalSpent  = list.reduce((s, c) => s + c.spent, 0);
    const overBudget  = totalSpent > totalBudget;

    function handleCopyLast() {
        const [y, m] = month.split("-").map(Number);
        const prevM = m === 1 ? `${y - 1}-12` : `${y}-${pad2(m - 1)}`;
        budget.copyToMonth(prevM, month);
        refresh();
    }

    return (
        <div>
            {/* header */}
            <div className="page-header">
                <button onClick={prevMonth} className="text-[var(--color-muted)] text-lg px-1 active:text-white">‹</button>
                <span className="page-title">{monthLabel(month)}</span>
                <button onClick={nextMonth} className="text-[var(--color-muted)] text-lg px-1 active:text-white">›</button>
            </div>

            {/* summary */}
            {list.length > 0 && (
                <div className="grid grid-cols-3 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)]">
                    <div className="px-3 py-3 text-center">
                        <div className="label">BUDGET</div>
                        <div className="text-sm font-bold mt-1" style={{ color: "var(--color-accent)" }}>{fmt(totalBudget)}</div>
                    </div>
                    <div className="px-3 py-3 text-center">
                        <div className="label">SPENT</div>
                        <div className={`text-sm font-bold mt-1 ${overBudget ? "text-red-400" : "text-white"}`}>{fmt(totalSpent)}</div>
                    </div>
                    <div className="px-3 py-3 text-center">
                        <div className="label">LEFT</div>
                        <div className={`text-sm font-bold mt-1 ${overBudget ? "text-red-400" : ""}`}
                            style={!overBudget ? { color: "var(--color-accent)" } : undefined}>
                            {fmt(totalBudget - totalSpent)}
                        </div>
                    </div>
                </div>
            )}

            <AddCategoryBar month={month} onAdd={refresh} />

            {list.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">💰</div>
                    <div className="empty-state-title">NO BUDGET SET</div>
                    <div className="empty-state-hint">Add categories to track monthly spending</div>
                    {month !== `${now.getFullYear()}-${pad2(now.getMonth() + 1)}` && (
                        <button onClick={handleCopyLast}
                            className="mt-4 text-[10px] tracking-widest"
                            style={{ color: "var(--color-accent)" }}>
                            COPY FROM LAST MONTH
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {list.map((cat) => (
                        <CategoryRow
                            key={cat.id}
                            cat={cat}
                            onSpend={() => setSpending(cat)}
                            onDelete={() => { budget.remove(cat.id); refresh(); }}
                        />
                    ))}
                </>
            )}

            {spending && (
                <SpendModal
                    cat={spending}
                    onClose={() => setSpending(null)}
                    onSave={(amt) => { budget.addSpending(spending.id, amt); setSpending(null); refresh(); }}
                />
            )}
        </div>
    );
}
