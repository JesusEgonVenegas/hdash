import { useState, useEffect } from "react";
import { debts } from "../lib/db";
import type { Debt } from "../lib/db";

function AddBar({ onAdd }: { onAdd: (d: Omit<Debt, "id" | "createdAt">) => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [rate, setRate] = useState("");
    const [minPay, setMinPay] = useState("");
    const [dueDay, setDueDay] = useState("1");

    function submit() {
        if (!name.trim() || !amount) return;
        onAdd({
            name: name.trim(),
            startingAmount: parseFloat(amount),
            interestRate: parseFloat(rate) || 0,
            minPayment: parseFloat(minPay) || 0,
            dueDay: parseInt(dueDay) || 1,
        });
        setName(""); setAmount(""); setRate(""); setMinPay(""); setDueDay("1");
        setOpen(false);
    }

    if (!open) {
        return (
            <button onClick={() => setOpen(true)} className="w-full border-b border-neutral-800 px-4 py-3 text-left text-sm text-green-400 tracking-wider active:bg-neutral-900">
                + ADD DEBT
            </button>
        );
    }

    return (
        <div className="border-b border-neutral-800 bg-[#111] p-3 flex flex-col gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Debt name (e.g. Credit Card)"
                className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 w-full" />
            <div className="grid grid-cols-2 gap-2">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" placeholder="Balance ($)"
                    className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600" />
                <input value={rate} onChange={(e) => setRate(e.target.value)} type="number" min="0" step="0.01" placeholder="APR (%)"
                    className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600" />
                <input value={minPay} onChange={(e) => setMinPay(e.target.value)} type="number" min="0" placeholder="Min payment ($)"
                    className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600" />
                <input value={dueDay} onChange={(e) => setDueDay(e.target.value)} type="number" min="1" max="31" placeholder="Due day of month"
                    className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600" />
            </div>
            <div className="flex gap-2">
                <button onClick={submit} className="flex-1 py-2 bg-green-400 text-black text-xs font-bold tracking-wider">SAVE</button>
                <button onClick={() => setOpen(false)} className="flex-1 py-2 border border-neutral-700 text-neutral-400 text-xs tracking-wider">CANCEL</button>
            </div>
        </div>
    );
}

function fmt(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Months to payoff using fixed minimum payment
function monthsToPayoff(balance: number, apr: number, minPay: number): number | null {
    if (minPay <= 0) return null;
    const r = apr / 100 / 12;
    if (r === 0) return Math.ceil(balance / minPay);
    if (minPay <= balance * r) return null; // never pays off
    return Math.ceil(-Math.log(1 - (balance * r) / minPay) / Math.log(1 + r));
}

export function DebtsPage() {
    const [list, setList] = useState<Debt[]>([]);
    const [expanded, setExpanded] = useState<string | null>(null);

    function refresh() { setList(debts.list()); }
    useEffect(refresh, []);

    const total = list.reduce((s, d) => s + d.startingAmount, 0);

    return (
        <div>
            <div className="px-4 pt-4 pb-2 border-b border-neutral-800 flex items-center justify-between">
                <span className="text-green-400 font-bold tracking-widest text-sm">&gt; DEBTS</span>
                {list.length > 0 && (
                    <span className="text-[10px] text-neutral-500">TOTAL {fmt(total)}</span>
                )}
            </div>

            <AddBar onAdd={(d) => { debts.add(d); refresh(); }} />

            {list.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-600 text-sm">No debts tracked.</div>
            ) : (
                list.map((debt) => {
                    const months = monthsToPayoff(debt.startingAmount, debt.interestRate, debt.minPayment);
                    return (
                        <div key={debt.id} className="border-b border-neutral-800 last:border-0">
                            <div className="flex items-center gap-3 px-4 py-3 active:bg-neutral-900"
                                onClick={() => setExpanded(expanded === debt.id ? null : debt.id)}>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-neutral-200 truncate">{debt.name}</div>
                                    <div className="text-[10px] text-neutral-500">
                                        {debt.interestRate}% APR · due day {debt.dueDay}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-sm text-red-400 font-bold">{fmt(debt.startingAmount)}</div>
                                    {debt.minPayment > 0 && (
                                        <div className="text-[10px] text-neutral-500">{fmt(debt.minPayment)}/mo</div>
                                    )}
                                </div>
                            </div>
                            {expanded === debt.id && (
                                <div className="px-4 pb-3 bg-[#111] flex flex-col gap-1">
                                    {months !== null && (
                                        <div className="text-[10px] text-neutral-400">
                                            Payoff in ~{months} months at min payment
                                        </div>
                                    )}
                                    {months === null && debt.minPayment > 0 && (
                                        <div className="text-[10px] text-red-400">Min payment doesn't cover interest</div>
                                    )}
                                    <div className="flex justify-end mt-1">
                                        <button onClick={() => { debts.remove(debt.id); refresh(); }} className="text-[10px] text-red-400 tracking-wider">DELETE</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}
