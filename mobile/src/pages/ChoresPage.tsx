import { useState, useEffect } from "react";
import { chores } from "../lib/db";
import type { ChoreItem, Frequency } from "../lib/db";

const FREQUENCIES: Frequency[] = ["daily", "weekly", "biweekly", "monthly"];

function AddBar({ onAdd }: { onAdd: (name: string, freq: Frequency, desc?: string) => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [freq, setFreq] = useState<Frequency>("weekly");
    const [desc, setDesc] = useState("");

    function submit() {
        if (!name.trim()) return;
        onAdd(name.trim(), freq, desc.trim() || undefined);
        setName(""); setFreq("weekly"); setDesc(""); setOpen(false);
    }

    if (!open) {
        return (
            <button onClick={() => setOpen(true)} className="w-full border-b border-neutral-800 px-4 py-3 text-left text-sm text-green-400 tracking-wider active:bg-neutral-900">
                + ADD CHORE
            </button>
        );
    }

    return (
        <div className="border-b border-neutral-800 bg-[#111] p-3 flex flex-col gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Chore name..."
                className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 w-full" />
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)"
                className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 w-full" />
            <div className="grid grid-cols-4 gap-1">
                {FREQUENCIES.map((f) => (
                    <button key={f} onClick={() => setFreq(f)}
                        className={`py-1 text-[10px] tracking-wider border ${freq === f ? "border-green-400 text-green-400" : "border-neutral-700 text-neutral-500"}`}>
                        {f === "biweekly" ? "2WK" : f.toUpperCase().slice(0, 3)}
                    </button>
                ))}
            </div>
            <div className="flex gap-2">
                <button onClick={submit} className="flex-1 py-2 bg-green-400 text-black text-xs font-bold tracking-wider">SAVE</button>
                <button onClick={() => setOpen(false)} className="flex-1 py-2 border border-neutral-700 text-neutral-400 text-xs tracking-wider">CANCEL</button>
            </div>
        </div>
    );
}

function ChoreRow({ item, onComplete, onDelete }: {
    item: ChoreItem;
    onComplete: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const isOverdue = !item.isCompletedThisCycle && new Date(item.nextDueDate) < new Date();

    return (
        <div className="border-b border-neutral-800 last:border-0">
            <div className="flex items-center gap-3 px-4 py-3 active:bg-neutral-900" onClick={() => setExpanded((v) => !v)}>
                <button
                    onClick={(e) => { e.stopPropagation(); if (!item.isCompletedThisCycle) onComplete(item.id); }}
                    className={`w-5 h-5 shrink-0 border flex items-center justify-center text-[10px] ${
                        item.isCompletedThisCycle ? "border-green-400 text-green-400 bg-green-400/10" : isOverdue ? "border-red-400" : "border-neutral-600"
                    }`}
                >
                    {item.isCompletedThisCycle ? "✓" : ""}
                </button>
                <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${item.isCompletedThisCycle ? "line-through text-neutral-600" : "text-neutral-200"}`}>
                        {item.name}
                    </div>
                    {item.description && (
                        <div className="text-[10px] text-neutral-600 truncate">{item.description}</div>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <div className="text-[10px] text-neutral-500">{item.frequency.toUpperCase()}</div>
                    {!item.isCompletedThisCycle && (
                        <div className={`text-[10px] ${isOverdue ? "text-red-400" : "text-neutral-600"}`}>
                            {isOverdue ? "OVERDUE" : new Date(item.nextDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                    )}
                </div>
            </div>
            {expanded && (
                <div className="px-4 pb-3 bg-[#111] flex justify-end">
                    <button onClick={() => onDelete(item.id)} className="text-[10px] text-red-400 tracking-wider">DELETE</button>
                </div>
            )}
        </div>
    );
}

export function ChoresPage() {
    const [list, setList] = useState<ChoreItem[]>([]);

    function refresh() { setList(chores.list()); }
    useEffect(refresh, []);

    return (
        <div>
            <div className="px-4 pt-4 pb-2 border-b border-neutral-800 flex items-center justify-between">
                <span className="text-green-400 font-bold tracking-widest text-sm">&gt; CHORES</span>
                <span className="text-[10px] text-neutral-500">
                    {list.filter((c) => c.isCompletedThisCycle).length}/{list.length} DONE
                </span>
            </div>

            <AddBar onAdd={(n, f, d) => { chores.add(n, f, d); refresh(); }} />

            {list.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-600 text-sm">No chores yet.</div>
            ) : (
                list.map((item) => (
                    <ChoreRow
                        key={item.id}
                        item={item}
                        onComplete={(id) => { chores.complete(id); refresh(); }}
                        onDelete={(id) => { chores.remove(id); refresh(); }}
                    />
                ))
            )}
        </div>
    );
}
