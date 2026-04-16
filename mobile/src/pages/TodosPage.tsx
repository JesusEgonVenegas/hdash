import { useState, useEffect, useRef } from "react";
import { todos } from "../lib/db";
import type { TodoItem, Priority } from "../lib/db";

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const priorityColor: Record<Priority, string> = {
    high:   "#f87171",
    medium: "#fbbf24",
    low:    "#525252",
};
const priorityLabel: Record<Priority, string> = {
    high: "!", medium: "~", low: "·",
};

function AddBar({ onAdd }: { onAdd: (title: string, priority: Priority, dueDate?: string) => void }) {
    const [open,     setOpen]     = useState(false);
    const [title,    setTitle]    = useState("");
    const [priority, setPriority] = useState<Priority>("medium");
    const [dueDate,  setDueDate]  = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

    function submit() {
        if (!title.trim()) return;
        onAdd(title.trim(), priority, dueDate || undefined);
        setTitle(""); setPriority("medium"); setDueDate(""); setOpen(false);
    }

    if (!open) {
        return (
            <button onClick={() => setOpen(true)}
                className="w-full border-b border-[var(--color-border)] px-4 py-3 text-left text-xs tracking-widest active:bg-neutral-900"
                style={{ color: "var(--color-accent)" }}>
                + ADD TODO
            </button>
        );
    }

    return (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex flex-col gap-2">
            <input ref={inputRef} value={title} onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Task title..."
                className="input-field" />
            <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                    <button key={p} onClick={() => setPriority(p)}
                        className="flex-1 py-1.5 text-[10px] tracking-wider border transition-colors"
                        style={{
                            borderColor: priority === p ? priorityColor[p] : "var(--color-border)",
                            color: priority === p ? priorityColor[p] : "var(--color-muted)",
                        }}>
                        {p.toUpperCase()}
                    </button>
                ))}
            </div>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="input-field text-xs" />
            <div className="flex gap-2">
                <button onClick={submit} className="btn-primary flex-1">SAVE</button>
                <button onClick={() => setOpen(false)} className="btn-ghost flex-1">CANCEL</button>
            </div>
        </div>
    );
}

function TodoRow({ item, onToggle, onDelete }: {
    item: TodoItem; onToggle: () => void; onDelete: () => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border-b border-[var(--color-border)] last:border-0">
            <div className="list-row" onClick={() => setExpanded((v) => !v)}>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                    className={`checkbox ${item.isCompleted ? "checked" : ""}`}
                >
                    {item.isCompleted ? "✓" : ""}
                </button>
                <span className={`flex-1 text-sm truncate ${item.isCompleted ? "line-through text-[var(--color-muted)]" : ""}`}>
                    {item.title}
                </span>
                {item.dueDate && !item.isCompleted && (
                    <span className="text-[9px] text-[var(--color-muted)] shrink-0 mr-1">
                        {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                )}
                <span className="text-sm font-bold shrink-0" style={{ color: priorityColor[item.priority] }}>
                    {priorityLabel[item.priority]}
                </span>
            </div>
            {expanded && (
                <div className="px-4 pb-3 bg-[var(--color-surface)] flex gap-3 items-center">
                    <span className="text-[9px] text-[var(--color-muted)] flex-1 tracking-wider">
                        {item.priority.toUpperCase()} PRIORITY
                        {item.dueDate && ` · DUE ${new Date(item.dueDate).toLocaleDateString()}`}
                    </span>
                    <button onClick={onDelete} className="text-[10px] text-red-400 tracking-wider">DELETE</button>
                </div>
            )}
        </div>
    );
}

export function TodosPage() {
    const [list, setList] = useState<TodoItem[]>([]);

    function refresh() { setList(todos.list()); }
    useEffect(refresh, []);

    const hasCompleted = list.some((t) => t.isCompleted);
    const pending = list.filter((t) => !t.isCompleted).length;

    return (
        <div>
            <div className="page-header">
                <span className="page-title">&gt; TODOS</span>
                <div className="flex items-center gap-3">
                    {list.length > 0 && (
                        <span className="label">{pending}/{list.length}</span>
                    )}
                    {hasCompleted && (
                        <button onClick={() => { todos.clearCompleted(); refresh(); }}
                            className="text-[10px] text-[var(--color-muted)] tracking-wider active:text-red-400">
                            CLEAR DONE
                        </button>
                    )}
                </div>
            </div>

            <AddBar onAdd={(t, p, d) => { todos.add(t, p, d); refresh(); }} />

            {list.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">✓</div>
                    <div className="empty-state-title">NO TODOS</div>
                    <div className="empty-state-hint">Tap + ADD TODO to get started</div>
                </div>
            ) : (
                list.map((item) => (
                    <TodoRow
                        key={item.id}
                        item={item}
                        onToggle={() => { todos.toggle(item.id); refresh(); }}
                        onDelete={() => { todos.remove(item.id); refresh(); }}
                    />
                ))
            )}
        </div>
    );
}
