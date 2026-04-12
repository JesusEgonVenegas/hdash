import { useState, useEffect, useRef } from "react";
import { todos } from "../lib/db";
import type { TodoItem, Priority } from "../lib/db";

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const priorityColor: Record<Priority, string> = {
    high: "text-red-400",
    medium: "text-yellow-400",
    low: "text-neutral-500",
};

function AddBar({ onAdd }: { onAdd: (title: string, priority: Priority) => void }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [priority, setPriority] = useState<Priority>("medium");
    const inputRef = useRef<HTMLInputElement>(null);

    function submit() {
        if (!title.trim()) return;
        onAdd(title.trim(), priority);
        setTitle("");
        setPriority("medium");
        setOpen(false);
    }

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-full border-b border-neutral-800 px-4 py-3 text-left text-sm text-green-400 tracking-wider active:bg-neutral-900"
            >
                + ADD TODO
            </button>
        );
    }

    return (
        <div className="border-b border-neutral-800 bg-[#111] p-3 flex flex-col gap-2">
            <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Task title..."
                className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 w-full"
            />
            <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                    <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-1 text-xs tracking-wider border transition-colors ${
                            priority === p
                                ? "border-green-400 text-green-400"
                                : "border-neutral-700 text-neutral-500"
                        }`}
                    >
                        {p.toUpperCase()}
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

function TodoRow({ item, onToggle, onDelete }: {
    item: TodoItem;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border-b border-neutral-800 last:border-0">
            <div
                className="flex items-center gap-3 px-4 py-3 active:bg-neutral-900"
                onClick={() => setExpanded((v) => !v)}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
                    className={`w-4 h-4 shrink-0 border flex items-center justify-center text-[10px] ${
                        item.isCompleted ? "border-green-400 text-green-400" : "border-neutral-600"
                    }`}
                >
                    {item.isCompleted ? "✓" : ""}
                </button>
                <span className={`flex-1 text-sm truncate ${item.isCompleted ? "line-through text-neutral-600" : "text-neutral-200"}`}>
                    {item.title}
                </span>
                <span className={`text-[10px] shrink-0 ${priorityColor[item.priority]}`}>
                    {item.priority.toUpperCase()}
                </span>
            </div>
            {expanded && (
                <div className="px-4 pb-3 flex gap-2 bg-[#111]">
                    {item.dueDate && (
                        <span className="text-[10px] text-neutral-500 mr-auto">
                            DUE {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                    )}
                    <button
                        onClick={() => onDelete(item.id)}
                        className="text-[10px] text-red-400 tracking-wider"
                    >
                        DELETE
                    </button>
                </div>
            )}
        </div>
    );
}

export function TodosPage() {
    const [list, setList] = useState<TodoItem[]>([]);

    function refresh() { setList(todos.list()); }
    useEffect(refresh, []);

    function handleAdd(title: string, priority: Priority) {
        todos.add(title, priority);
        refresh();
    }

    function handleToggle(id: string) {
        todos.toggle(id);
        refresh();
    }

    function handleDelete(id: string) {
        todos.remove(id);
        refresh();
    }

    function handleClearCompleted() {
        todos.clearCompleted();
        refresh();
    }

    const hasCompleted = list.some((t) => t.isCompleted);

    return (
        <div>
            <div className="px-4 pt-4 pb-2 border-b border-neutral-800 flex items-center justify-between">
                <span className="text-green-400 font-bold tracking-widest text-sm">&gt; TODOS</span>
                {hasCompleted && (
                    <button onClick={handleClearCompleted} className="text-[10px] text-neutral-500 tracking-wider">
                        CLEAR DONE
                    </button>
                )}
            </div>
            <AddBar onAdd={handleAdd} />
            {list.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-600 text-sm">No todos yet.</div>
            ) : (
                <div>
                    {list.map((item) => (
                        <TodoRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </div>
    );
}
