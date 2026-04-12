import { useState, useEffect, useRef } from "react";
import { grocery } from "../lib/db";
import type { GroceryItem } from "../lib/db";

function AddBar({ onAdd }: { onAdd: (name: string, qty: number, category?: string) => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [qty, setQty] = useState("1");
    const [category, setCategory] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

    function submit() {
        if (!name.trim()) return;
        onAdd(name.trim(), Math.max(1, parseInt(qty) || 1), category.trim() || undefined);
        setName(""); setQty("1"); setCategory(""); setOpen(false);
    }

    if (!open) {
        return (
            <button onClick={() => setOpen(true)} className="w-full border-b border-neutral-800 px-4 py-3 text-left text-sm text-green-400 tracking-wider active:bg-neutral-900">
                + ADD ITEM
            </button>
        );
    }

    return (
        <div className="border-b border-neutral-800 bg-[#111] p-3 flex flex-col gap-2">
            <input ref={inputRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Item name..." className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 w-full" />
            <div className="flex gap-2">
                <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="1"
                    placeholder="Qty" className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 w-20" />
                <input value={category} onChange={(e) => setCategory(e.target.value)}
                    placeholder="Category (opt.)" className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 flex-1 placeholder-neutral-600" />
            </div>
            <div className="flex gap-2">
                <button onClick={submit} className="flex-1 py-2 bg-green-400 text-black text-xs font-bold tracking-wider">SAVE</button>
                <button onClick={() => setOpen(false)} className="flex-1 py-2 border border-neutral-700 text-neutral-400 text-xs tracking-wider">CANCEL</button>
            </div>
        </div>
    );
}

export function GroceryPage() {
    const [list, setList] = useState<GroceryItem[]>([]);

    function refresh() { setList(grocery.list()); }
    useEffect(refresh, []);

    const byCategory = list.reduce<Record<string, GroceryItem[]>>((acc, item) => {
        const cat = item.category ?? "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const hasChecked = list.some((g) => g.isChecked);

    return (
        <div>
            <div className="px-4 pt-4 pb-2 border-b border-neutral-800 flex items-center justify-between">
                <span className="text-green-400 font-bold tracking-widest text-sm">&gt; GROCERY</span>
                {hasChecked && (
                    <button onClick={() => { grocery.clearChecked(); refresh(); }} className="text-[10px] text-neutral-500 tracking-wider">
                        CLEAR CHECKED
                    </button>
                )}
            </div>

            <AddBar onAdd={(n, q, c) => { grocery.add(n, q, c); refresh(); }} />

            {list.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-600 text-sm">List is empty.</div>
            ) : (
                Object.entries(byCategory).map(([cat, items]) => (
                    <div key={cat}>
                        <div className="px-4 py-1.5 bg-[#111] border-b border-neutral-800">
                            <span className="text-[10px] text-neutral-500 tracking-widest">{cat.toUpperCase()}</span>
                        </div>
                        {items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 last:border-0 active:bg-neutral-900"
                                onClick={() => { grocery.toggle(item.id); refresh(); }}>
                                <div className={`w-4 h-4 shrink-0 border flex items-center justify-center text-[10px] ${item.isChecked ? "border-green-400 text-green-400" : "border-neutral-600"}`}>
                                    {item.isChecked ? "✓" : ""}
                                </div>
                                <span className={`flex-1 text-sm ${item.isChecked ? "line-through text-neutral-600" : "text-neutral-200"}`}>
                                    {item.name}
                                </span>
                                {item.quantity > 1 && (
                                    <span className="text-[10px] text-neutral-500">×{item.quantity}</span>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); grocery.remove(item.id); refresh(); }}
                                    className="text-neutral-700 text-sm px-1 active:text-red-400"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
}
