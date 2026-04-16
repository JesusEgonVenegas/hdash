import { useState, useEffect } from "react";
import { chores } from "../lib/db";
import type { ChoreItem, Frequency } from "../lib/db";

const FREQUENCIES: { id: Frequency; label: string }[] = [
    { id: "daily",    label: "DAILY"   },
    { id: "weekly",   label: "WEEKLY"  },
    { id: "biweekly", label: "2 WKS"  },
    { id: "monthly",  label: "MONTHLY" },
];

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
            <button onClick={() => setOpen(true)}
                className="w-full border-b border-[var(--color-border)] px-4 py-3 text-left text-xs tracking-widest active:bg-neutral-900"
                style={{ color: "var(--color-accent)" }}>
                + ADD CHORE
            </button>
        );
    }

    return (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex flex-col gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Chore name..."
                className="input-field" />
            <input value={desc} onChange={(e) => setDesc(e.target.value)}
                placeholder="Description (optional)"
                className="input-field" />
            <div className="grid grid-cols-4 gap-1">
                {FREQUENCIES.map((f) => (
                    <button key={f.id} onClick={() => setFreq(f.id)}
                        className="py-1.5 text-[9px] tracking-wider border transition-colors"
                        style={{
                            borderColor: freq === f.id ? "var(--color-accent)" : "var(--color-border)",
                            color: freq === f.id ? "var(--color-accent)" : "var(--color-muted)",
                        }}>
                        {f.label}
                    </button>
                ))}
            </div>
            <div className="flex gap-2">
                <button onClick={submit} className="btn-primary flex-1">SAVE</button>
                <button onClick={() => setOpen(false)} className="btn-ghost flex-1">CANCEL</button>
            </div>
        </div>
    );
}

function ChoreRow({ item, onComplete, onDelete }: {
    item: ChoreItem;
    onComplete: () => void;
    onDelete: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const isOverdue = !item.isCompletedThisCycle && new Date(item.nextDueDate) < new Date();
    const dueDate   = new Date(item.nextDueDate);
    const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);

    return (
        <div className="border-b border-[var(--color-border)] last:border-0">
            <div className="list-row" onClick={() => setExpanded((v) => !v)}>
                <button
                    onClick={(e) => { e.stopPropagation(); if (!item.isCompletedThisCycle) onComplete(); }}
                    className={`checkbox ${item.isCompletedThisCycle ? "checked" : ""} ${isOverdue ? "!border-red-400" : ""}`}
                >
                    {item.isCompletedThisCycle ? "✓" : ""}
                </button>
                <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${item.isCompletedThisCycle ? "line-through text-[var(--color-muted)]" : ""}`}>
                        {item.name}
                    </div>
                    {item.description && (
                        <div className="text-[10px] text-[var(--color-muted)] truncate mt-0.5">{item.description}</div>
                    )}
                </div>
                <div className="text-right shrink-0 ml-2">
                    <div className="label">{item.frequency}</div>
                    {!item.isCompletedThisCycle && (
                        <div className={`text-[10px] mt-0.5 ${isOverdue ? "text-red-400" : daysUntil <= 1 ? "text-orange-400" : "text-[var(--color-muted)]"}`}>
                            {isOverdue
                                ? "OVERDUE"
                                : daysUntil === 0
                                ? "TODAY"
                                : daysUntil === 1
                                ? "TOMORROW"
                                : dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                    )}
                </div>
            </div>
            {expanded && (
                <div className="flex border-t border-[var(--color-border)]">
                    {!item.isCompletedThisCycle && (
                        <button onClick={onComplete}
                            className="flex-1 py-2 text-[10px] tracking-wider border-r border-[var(--color-border)] active:bg-neutral-900"
                            style={{ color: "var(--color-accent)" }}>
                            MARK DONE
                        </button>
                    )}
                    <button onClick={onDelete}
                        className="flex-1 py-2 text-[10px] tracking-wider text-red-400 active:bg-neutral-900">
                        DELETE
                    </button>
                </div>
            )}
        </div>
    );
}

export function ChoresPage() {
    const [list, setList] = useState<ChoreItem[]>([]);

    function refresh() { setList(chores.list()); }
    useEffect(refresh, []);

    const done  = list.filter((c) => c.isCompletedThisCycle).length;
    const total = list.length;

    return (
        <div>
            <div className="page-header">
                <span className="page-title">&gt; CHORES</span>
                {total > 0 && (
                    <span className="label">{done}/{total} DONE</span>
                )}
            </div>

            <AddBar onAdd={(n, f, d) => { chores.add(n, f, d); refresh(); }} />

            {list.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">↻</div>
                    <div className="empty-state-title">NO CHORES</div>
                    <div className="empty-state-hint">Add recurring tasks to track them</div>
                </div>
            ) : (
                list.map((item) => (
                    <ChoreRow
                        key={item.id}
                        item={item}
                        onComplete={() => { chores.complete(item.id); refresh(); }}
                        onDelete={() => { chores.remove(item.id); refresh(); }}
                    />
                ))
            )}
        </div>
    );
}
