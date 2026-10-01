import { useState, useEffect } from "react";
import { debts } from "../lib/db";
import type { Debt } from "../lib/db";

function AddBar({ onAdd }: { onAdd: (d: Omit<Debt, "id" | "createdAt">) => void }) {
    const [open,   setOpen]   = useState(false);
    const [name,   setName]   = useState("");
    const [amount, setAmount] = useState("");
    const [rate,   setRate]   = useState("");
    const [minPay, setMinPay] = useState("");
    const [dueDay, setDueDay] = useState("1");

    function submit() {
        if (!name.trim() || !amount) return;
        onAdd({
            name: name.trim(),
            startingAmount: parseFloat(amount),
            interestRate:   parseFloat(rate)   || 0,
            minPayment:     parseFloat(minPay) || 0,
            dueDay:         parseInt(dueDay)   || 1,
        });
        setName(""); setAmount(""); setRate(""); setMinPay(""); setDueDay("1"); setOpen(false);
    }

    if (!open) {
        return (
            <button onClick={() => setOpen(true)}
                className="w-full border-b border-[var(--color-border)] px-4 py-3 text-left text-xs tracking-widest active:bg-neutral-900"
                style={{ color: "var(--color-accent)" }}>
                + ADD DEBT
            </button>
        );
    }

    return (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex flex-col gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Debt name (e.g. Credit Card)"
                className="input-field" />
            <div className="grid grid-cols-2 gap-2">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" placeholder="Balance ($)" className="input-field" />
                <input value={rate}   onChange={(e) => setRate(e.target.value)}   type="number" min="0" step="0.01" placeholder="APR (%)" className="input-field" />
                <input value={minPay} onChange={(e) => setMinPay(e.target.value)} type="number" min="0" placeholder="Min payment ($)" className="input-field" />
                <input value={dueDay} onChange={(e) => setDueDay(e.target.value)} type="number" min="1" max="31" placeholder="Due day" className="input-field" />
            </div>
            <div className="flex gap-2">
                <button onClick={submit} className="btn-primary flex-1">SAVE</button>
                <button onClick={() => setOpen(false)} className="btn-ghost flex-1">CANCEL</button>
            </div>
        </div>
    );
}

function fmt(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function monthsToPayoff(balance: number, apr: number, minPay: number): number | null {
    if (minPay <= 0) return null;
    const r = apr / 100 / 12;
    if (r === 0) return Math.ceil(balance / minPay);
    if (minPay <= balance * r) return null;
    return Math.ceil(-Math.log(1 - (balance * r) / minPay) / Math.log(1 + r));
}

function DebtRow({ debt, onDelete }: { debt: Debt; onDelete: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const months = monthsToPayoff(debt.startingAmount, debt.interestRate, debt.minPayment);
    const pct = 0; // no current balance tracking yet, just starting amount

    return (
        <div className="border-b border-[var(--color-border)] last:border-0">
            <div className="list-row" onClick={() => setExpanded((v) => !v)}>
                <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{debt.name}</div>
                    <div className="label mt-0.5">{debt.interestRate}% APR · due day {debt.dueDay}</div>
                </div>
                <div className="text-right shrink-0 ml-3">
                    <div className="text-sm font-bold text-red-400">{fmt(debt.startingAmount)}</div>
                    {debt.minPayment > 0 && (
                        <div className="label mt-0.5">{fmt(debt.minPayment)}/mo</div>
                    )}
                </div>
            </div>
            {expanded && (
                <div className="px-4 pb-3 bg-[var(--color-surface)] flex flex-col gap-1">
                    {months !== null ? (
                        <div className="text-xs text-[var(--color-muted)]">
                            Payoff in ~{months} months ({Math.round(months / 12 * 10) / 10} yrs) at min payment
                        </div>
                    ) : debt.minPayment > 0 ? (
                        <div className="text-xs text-red-400">Min payment doesn't cover interest — balance will grow</div>
                    ) : null}
                    <div className="flex justify-end mt-1">
                        <button onClick={onDelete} className="text-[10px] text-red-400 tracking-wider">DELETE</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function DebtsPage() {
    const [list, setList] = useState<Debt[]>([]);

    function refresh() { setList(debts.list()); }
    useEffect(refresh, []);

    const total    = list.reduce((s, d) => s + d.startingAmount, 0);
    const minTotal = list.reduce((s, d) => s + d.minPayment, 0);

    return (
        <div>
            <div className="page-header">
                <span className="page-title">&gt; DEBTS</span>
                {list.length > 0 && (
                    <span className="text-xs font-bold" style={{ color: "var(--color-accent)" }}>{fmt(total)}</span>
                )}
            </div>

            {/* summary bar */}
            {list.length > 1 && (
                <div className="grid grid-cols-2 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)]">
                    <div className="px-4 py-3">
                        <div className="label">TOTAL DEBT</div>
                        <div className="text-sm font-bold text-red-400 mt-1">{fmt(total)}</div>
                    </div>
                    <div className="px-4 py-3">
                        <div className="label">MIN / MONTH</div>
                        <div className="text-sm font-bold mt-1" style={{ color: "var(--color-accent)" }}>{fmt(minTotal)}</div>
                    </div>
                </div>
            )}

            <AddBar onAdd={(d) => { debts.add(d); refresh(); }} />

            {list.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">💳</div>
                    <div className="empty-state-title">NO DEBTS TRACKED</div>
                    <div className="empty-state-hint">Track balances, APR, and payoff time</div>
                </div>
            ) : (
                list.map((debt) => (
                    <DebtRow key={debt.id} debt={debt} onDelete={() => { debts.remove(debt.id); refresh(); }} />
                ))
            )}
        </div>
    );
}
