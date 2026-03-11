"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { TodoItem } from "@/types/todo";
import type { HouseholdMember } from "@/types/household";
import type { Household } from "@/types/household";

const PRIORITY_COLORS: Record<string, string> = {
    high: "text-red-400",
    medium: "text-yellow-400",
    low: "text-neutral-400",
};

const PRIORITY_LABELS: Record<string, string> = {
    high: "!!!",
    medium: "!!",
    low: "!",
};

export default function TodosPage() {
    const { token, user, isLoading } = useAuth();
    const [items, setItems] = useState<TodoItem[]>([]);
    const [members, setMembers] = useState<HouseholdMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // add form
    const [newTitle, setNewTitle] = useState("");
    const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
    const [newDueDate, setNewDueDate] = useState("");
    const [newAssignee, setNewAssignee] = useState("");
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const loadItems = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiFetch<TodoItem[]>("/api/todos", { token });
            setItems(data);
            setError(null);
        } catch (err: any) {
            setError(err.message ?? "Failed to load todos");
        } finally {
            setLoading(false);
        }
    }, [token]);

    const loadMembers = useCallback(async () => {
        if (!token || !user?.householdId) return;
        try {
            const h = await apiFetch<Household>("/api/household", { token });
            setMembers(h.members);
        } catch {
            // not in household or error, ignore
        }
    }, [token, user?.householdId]);

    useEffect(() => {
        if (isLoading || !token) return;
        loadItems();
        loadMembers();
    }, [token, isLoading, loadItems, loadMembers]);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setAdding(true);
        setError(null);

        try {
            const body: any = {
                title: newTitle.trim(),
                priority: newPriority,
            };
            if (newDueDate) body.dueDate = new Date(newDueDate).toISOString();
            if (newAssignee) body.assignedToUserId = newAssignee;

            const created = await apiFetch<TodoItem>("/api/todos", {
                method: "POST",
                body,
                token,
            });
            setItems((prev) => [created, ...prev]);
            setNewTitle("");
            setNewPriority("medium");
            setNewDueDate("");
            setNewAssignee("");
            setShowForm(false);
        } catch (err: any) {
            setError(err.data?.error ?? err.message ?? "Failed to add todo");
        } finally {
            setAdding(false);
        }
    }

    async function handleToggle(id: string) {
        try {
            const updated = await apiFetch<TodoItem>(`/api/todos/${id}/toggle`, {
                method: "PUT",
                token,
            });
            setItems((prev) =>
                prev.map((item) => (item.id === id ? updated : item))
            );
        } catch (err: any) {
            setError(err.message ?? "Failed to toggle todo");
        }
    }

    async function handleDelete(id: string) {
        try {
            await apiFetch(`/api/todos/${id}`, {
                method: "DELETE",
                token,
            });
            setItems((prev) => prev.filter((item) => item.id !== id));
        } catch (err: any) {
            setError(err.message ?? "Failed to delete todo");
        }
    }

    async function handleClearCompleted() {
        if (!confirm("Remove all completed todos?")) return;

        try {
            await apiFetch("/api/todos/completed", {
                method: "DELETE",
                token,
            });
            setItems((prev) => prev.filter((item) => !item.isCompleted));
        } catch (err: any) {
            setError(err.message ?? "Failed to clear completed");
        }
    }

    if (isLoading || loading) {
        return (
            <section className="text-white font-mono p-6">
                <p className="text-neutral-500">loading...</p>
            </section>
        );
    }

    const pendingItems = items.filter((i) => !i.isCompleted);
    const completedItems = items.filter((i) => i.isCompleted);

    return (
        <section className="text-white font-mono space-y-6">
            <header className="ascii-panel p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold">Todos</h1>
                        <p className="text-neutral-500 text-xs mt-1">
                            {pendingItems.length} pending · {completedItems.length} done
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {completedItems.length > 0 && (
                            <button
                                onClick={handleClearCompleted}
                                className="text-neutral-400 hover:text-red-400 text-sm border border-neutral-600 px-2 py-1"
                            >
                                clear done
                            </button>
                        )}
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="ascii-button text-sm"
                        >
                            {showForm ? "cancel" : "+ new"}
                        </button>
                    </div>
                </div>
            </header>

            {error && (
                <div className="ascii-panel p-3 border-red-500 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* ADD FORM */}
            {showForm && (
                <div className="ascii-panel p-4">
                    <form onSubmit={handleAdd} className="space-y-3">
                        <div>
                            <label className="block text-neutral-500 text-xs mb-1">title</label>
                            <input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="what needs to be done?"
                                className="w-full bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm focus:outline-none focus:border-green-400"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-neutral-500 text-xs mb-1">priority</label>
                                <select
                                    value={newPriority}
                                    onChange={(e) => setNewPriority(e.target.value as any)}
                                    className="w-full bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm focus:outline-none"
                                >
                                    <option value="low">low</option>
                                    <option value="medium">medium</option>
                                    <option value="high">high</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-neutral-500 text-xs mb-1">due date</label>
                                <input
                                    type="date"
                                    value={newDueDate}
                                    onChange={(e) => setNewDueDate(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm focus:outline-none"
                                />
                            </div>

                            {members.length > 0 && (
                                <div>
                                    <label className="block text-neutral-500 text-xs mb-1">assign to</label>
                                    <select
                                        value={newAssignee}
                                        onChange={(e) => setNewAssignee(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm focus:outline-none"
                                    >
                                        <option value="">unassigned</option>
                                        {members.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.displayName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={adding || !newTitle.trim()}
                            className="ascii-button text-sm disabled:opacity-50"
                        >
                            {adding ? "..." : "add todo"}
                        </button>
                    </form>
                </div>
            )}

            {/* PENDING ITEMS */}
            {pendingItems.length === 0 && completedItems.length === 0 && (
                <div className="ascii-panel p-4 text-neutral-500 text-sm text-center">
                    no todos yet — click &quot;+ new&quot; to add one
                </div>
            )}

            {pendingItems.length > 0 && (
                <div className="ascii-panel p-4 space-y-1">
                    {pendingItems.map((item) => (
                        <TodoRow
                            key={item.id}
                            item={item}
                            currentUserId={user?.id}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* COMPLETED ITEMS */}
            {completedItems.length > 0 && (
                <div className="ascii-panel p-4 space-y-1">
                    <div className="text-neutral-500 text-xs mb-2">
                        completed ({completedItems.length})
                    </div>
                    {completedItems.map((item) => (
                        <TodoRow
                            key={item.id}
                            item={item}
                            currentUserId={user?.id}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function TodoRow({
    item,
    currentUserId,
    onToggle,
    onDelete,
}: {
    item: TodoItem;
    currentUserId?: string;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const isOverdue =
        !item.isCompleted &&
        item.dueDate &&
        new Date(item.dueDate) < new Date();

    return (
        <div
            className={`flex items-start justify-between py-2 border-b border-neutral-800 group ${
                item.isCompleted ? "opacity-50" : ""
            }`}
        >
            <div className="flex items-start gap-3 flex-1 min-w-0">
                <button
                    onClick={() => onToggle(item.id)}
                    className={`w-5 h-5 border flex-shrink-0 flex items-center justify-center text-xs mt-0.5 ${
                        item.isCompleted
                            ? "border-green-500 text-green-400"
                            : "border-neutral-600 hover:border-green-400"
                    }`}
                >
                    {item.isCompleted ? "✓" : ""}
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span
                            className={`text-sm ${
                                item.isCompleted
                                    ? "line-through text-neutral-500"
                                    : "text-white"
                            }`}
                        >
                            {item.title}
                        </span>
                        <span className={`text-xs ${PRIORITY_COLORS[item.priority]}`}>
                            {PRIORITY_LABELS[item.priority]}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 mt-0.5">
                        {item.dueDate && (
                            <span
                                className={`text-xs ${
                                    isOverdue ? "text-red-400" : "text-neutral-500"
                                }`}
                            >
                                {isOverdue ? "overdue: " : "due: "}
                                {new Date(item.dueDate).toLocaleDateString()}
                            </span>
                        )}

                        {item.assignedToName && (
                            <span className="text-xs text-blue-400">
                                @{item.assignedToName}
                            </span>
                        )}

                        {item.createdByName &&
                            item.createdByUserId !== currentUserId && (
                                <span className="text-xs text-neutral-600">
                                    by {item.createdByName}
                                </span>
                            )}
                    </div>
                </div>
            </div>

            <button
                onClick={() => onDelete(item.id)}
                className="text-neutral-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-2 mt-1"
            >
                ×
            </button>
        </div>
    );
}
