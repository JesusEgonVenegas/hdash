import { useState, useEffect, useRef } from "react";
import { grocery } from "../lib/db";
import { hapticLight } from "../lib/haptics";
import type { GroceryItem } from "../lib/db";

function AddBar({ onAdd }: { onAdd: (name: string, qty: number, price?: number, cat?: string) => void }) {
    const [open,     setOpen]     = useState(false);
    const [name,     setName]     = useState("");
    const [qty,      setQty]      = useState("1");
    const [price,    setPrice]    = useState("");
    const [category, setCategory] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

    function submit() {
        if (!name.trim()) return;
        onAdd(name.trim(), Math.max(1, parseInt(qty) || 1), price ? parseFloat(price) : undefined, category.trim() || undefined);
        setName(""); setQty("1"); setPrice(""); setCategory(""); setOpen(false);
    }

    if (!open) {
        return (
            <button onClick={() => setOpen(true)}
                className="w-full border-b border-[var(--color-border)] px-4 py-3 text-left text-xs tracking-widest active:bg-neutral-900"
                style={{ color: "var(--color-accent)" }}>
                + ADD ITEM
            </button>
        );
    }

    return (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex flex-col gap-2">
            <input ref={inputRef} value={name} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Item name..."
                className="input-field" />
            <div className="flex gap-2">
                <input value={qty} onChange={(e) => setQty(e.target.value)}
                    type="number" min="1" placeholder="Qty"
                    className="input-field w-16" />
                <input value={price} onChange={(e) => setPrice(e.target.value)}
                    type="number" min="0" step="0.01" placeholder="Price ($)"
                    className="input-field flex-1" />
            </div>
            <input value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (optional)"
                className="input-field" />
            <div className="flex gap-2">
                <button onClick={submit} className="btn-primary flex-1">SAVE</button>
                <button onClick={() => setOpen(false)} className="btn-ghost flex-1">CANCEL</button>
            </div>
        </div>
    );
}

function fmt(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function GroceryPage() {
    const [list, setList] = useState<GroceryItem[]>([]);

    function refresh() { setList(grocery.list()); }
    useEffect(refresh, []);

    const byCategory = list.reduce<Record<string, GroceryItem[]>>((acc, item) => {
        const cat = item.category ?? "Other";
        (acc[cat] ??= []).push(item);
        return acc;
    }, {});

    const hasChecked = list.some((g) => g.isChecked);
    const unchecked  = list.filter((g) => !g.isChecked);

    // running total of unchecked items with prices
    const total = unchecked.reduce((s, g) => s + (g.price ?? 0) * g.quantity, 0);
    const hasPrices = unchecked.some((g) => g.price != null);

    return (
        <div>
            <div className="page-header">
                <span className="page-title">&gt; GROCERY</span>
                <div className="flex items-center gap-3">
                    {hasPrices && (
                        <span className="text-xs font-bold" style={{ color: "var(--color-accent)" }}>{fmt(total)}</span>
                    )}
                    {hasChecked && (
                        <button onClick={() => { grocery.clearChecked(); refresh(); }}
                            className="text-[10px] text-[var(--color-muted)] tracking-wider active:text-red-400">
                            CLEAR
                        </button>
                    )}
                </div>
            </div>

            <AddBar onAdd={(n, q, p, c) => { grocery.add(n, q, c, p); refresh(); }} />

            {list.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">◈</div>
                    <div className="empty-state-title">LIST IS EMPTY</div>
                    <div className="empty-state-hint">Tap + ADD ITEM to build your list</div>
                </div>
            ) : (
                Object.entries(byCategory).map(([cat, items]) => (
                    <div key={cat}>
                        <div className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                            <span className="label">{cat}</span>
                        </div>
                        {items.map((item) => (
                            <div key={item.id}
                                className="list-row active:bg-neutral-900"
                                onClick={() => { hapticLight(); grocery.toggle(item.id); refresh(); }}>
                                <div className={`checkbox ${item.isChecked ? "checked" : ""}`}>
                                    {item.isChecked ? "✓" : ""}
                                </div>
                                <span className={`flex-1 text-sm ${item.isChecked ? "line-through text-[var(--color-muted)]" : ""}`}>
                                    {item.name}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                    {item.quantity > 1 && (
                                        <span className="text-[10px] text-[var(--color-muted)]">×{item.quantity}</span>
                                    )}
                                    {item.price != null && (
                                        <span className="text-[10px] text-[var(--color-muted)]">{fmt(item.price * item.quantity)}</span>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); grocery.remove(item.id); refresh(); }}
                                        className="text-[var(--color-border)] text-lg leading-none px-1 active:text-red-400 transition-colors">
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
}
