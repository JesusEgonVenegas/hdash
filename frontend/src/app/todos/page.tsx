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

    const [newTitle, setNewTitle] = useState("");
    const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
    const [newDueDate, setNewDueDate] = useState("");
    const [newAssignee, setNewAssignee] = useState("");
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // editing state
    const [editingId, setEditingId] = useState<string | null>(null);

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

    async function handleUpdate(id: string, patch: Partial<Pick<TodoItem, "title" | "priority" | "dueDate" | "assignedToUserId">>) {
        try {
            const updated = await apiFetch<TodoItem>(`/api/todos/${id}`, {
                method: "PUT",
                body: patch,
                token,
            });
            setItems((prev) =>
                prev.map((item) => (item.id === id ? updated : item))
            );
            setEditingId(null);
        } catch (err: any) {
            setError(err.message ?? "Failed to update todo");
        }
    }

    async function handleDelete(id: string) {
        try {
            await apiFetch(`/api/todos/${id}`, {
                method: "DELETE",
                token,
            });
            setItems((prev) => prev.filter((item) => item.id !== id));
            if (editingId === id) setEditingId(null);
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
            <section className="space-y-6">
                <div className="border border-neutral-700 p-4">
                    <h1 className="text-lg text-green-400">{"> "}TODOS</h1>
                </div>
                <p className="text-neutral-500 text-sm">loading...</p>
            </section>
        );
    }

    const pendingItems = items.filter((i) => !i.isCompleted);
    const completedItems = items.filter((i) => i.isCompleted);

    return (
        <section className="space-y-6">
            <div className="border border-neutral-700 p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg text-green-400">{"> "}TODOS</h1>
                        <p className="text-neutral-500 text-xs mt-1">
                            {pendingItems.length} pending · {completedItems.length} done
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {completedItems.length > 0 && (
                            <button
                                onClick={handleClearCompleted}
                                className="ascii-button-danger text-sm"
                            >
                                clear done
                            </button>
                        )}
                        <button
                            onClick={() => { setShowForm(!showForm); setEditingId(null); }}
                            className="border border-green-400 py-1 px-3 text-green-400 hover:bg-green-400/10 cursor-pointer text-sm"
                        >
                            {showForm ? "cancel" : "[ + NEW ]"}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="ascii-error">
                    [ERROR] {error}
                </div>
            )}

            {/* ADD FORM */}
            {showForm && (
                <div className="border border-neutral-700 p-6">
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="block text-sm text-neutral-400 mb-1">TITLE:</label>
                            <input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="what needs to be done?"
                                className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">PRIORITY:</label>
                                <select
                                    value={newPriority}
                                    onChange={(e) => setNewPriority(e.target.value as any)}
                                    className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                                >
                                    <option value="low" className="bg-neutral-900">low</option>
                                    <option value="medium" className="bg-neutral-900">medium</option>
                                    <option value="high" className="bg-neutral-900">high</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">DUE DATE:</label>
                                <input
                                    type="date"
                                    value={newDueDate}
                                    onChange={(e) => setNewDueDate(e.target.value)}
                                    className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                                />
                            </div>

                            {members.length > 0 && (
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-1">ASSIGN TO:</label>
                                    <select
                                        value={newAssignee}
                                        onChange={(e) => setNewAssignee(e.target.value)}
                                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                                    >
                                        <option value="" className="bg-neutral-900">unassigned</option>
                                        {members.map((m) => (
                                            <option key={m.id} value={m.id} className="bg-neutral-900">
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
                            className="border border-green-400 py-2 px-6 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                        >
                            {adding ? "Adding..." : "[ ADD TODO ]"}
                        </button>
                    </form>
                </div>
            )}

            {/* PENDING ITEMS */}
            {pendingItems.length === 0 && completedItems.length === 0 && (
                <div className="border border-neutral-700 p-4 text-neutral-500 text-sm text-center">
                    no todos yet — click &quot;[ + NEW ]&quot; to add one
                </div>
            )}

            {pendingItems.length > 0 && (
                <div className="border border-neutral-700 p-4 space-y-1">
                    {pendingItems.map((item) => (
                        <TodoRow
                            key={item.id}
                            item={item}
                            members={members}
                            currentUserId={user?.id}
                            isEditing={editingId === item.id}
                            onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                            onCancelEdit={() => setEditingId(null)}
                            onToggle={handleToggle}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* COMPLETED ITEMS */}
            {completedItems.length > 0 && (
                <div className="border border-neutral-700 p-4 space-y-1">
                    <div className="text-neutral-500 text-xs mb-2">
                        COMPLETED ({completedItems.length})
                    </div>
                    {completedItems.map((item) => (
                        <TodoRow
                            key={item.id}
                            item={item}
                            members={members}
                            currentUserId={user?.id}
                            isEditing={editingId === item.id}
                            onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                            onCancelEdit={() => setEditingId(null)}
                            onToggle={handleToggle}
                            onUpdate={handleUpdate}
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
    members,
    currentUserId,
    isEditing,
    onEdit,
    onCancelEdit,
    onToggle,
    onUpdate,
    onDelete,
}: {
    item: TodoItem;
    members: HouseholdMember[];
    currentUserId?: string;
    isEditing: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    onToggle: (id: string) => void;
    onUpdate: (id: string, patch: any) => void;
    onDelete: (id: string) => void;
}) {
    const [editTitle, setEditTitle] = useState(item.title);
    const [editPriority, setEditPriority] = useState(item.priority);
    const [editDueDate, setEditDueDate] = useState(
        item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : ""
    );
    const [editAssignee, setEditAssignee] = useState(item.assignedToUserId ?? "");
    const [saving, setSaving] = useState(false);

    // sync edit state when item changes externally
    useEffect(() => {
        if (!isEditing) {
            setEditTitle(item.title);
            setEditPriority(item.priority);
            setEditDueDate(item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : "");
            setEditAssignee(item.assignedToUserId ?? "");
        }
    }, [item, isEditing]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!editTitle.trim()) return;
        setSaving(true);
        try {
            const patch: any = {
                title: editTitle.trim(),
                priority: editPriority,
            };
            if (editDueDate) patch.dueDate = new Date(editDueDate).toISOString();
            else patch.dueDate = null;
            if (editAssignee) patch.assignedToUserId = editAssignee;
            else patch.assignedToUserId = null;
            await onUpdate(item.id, patch);
        } finally {
            setSaving(false);
        }
    }

    const isOverdue =
        !item.isCompleted &&
        item.dueDate &&
        new Date(item.dueDate) < new Date();

    return (
        <div className={`border-b border-neutral-800 ${item.isCompleted ? "opacity-50" : ""}`}>
            {/* MAIN ROW */}
            <div className="flex items-start justify-between py-2 group">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                        onClick={() => onToggle(item.id)}
                        className={`w-5 h-5 border flex-shrink-0 flex items-center justify-center text-xs mt-0.5 cursor-pointer ${
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

                <div className="flex items-center gap-2 ml-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onEdit}
                        className="text-neutral-500 hover:text-green-400 text-xs cursor-pointer"
                    >
                        {isEditing ? "▲" : "edit"}
                    </button>
                    <button
                        onClick={() => onDelete(item.id)}
                        className="text-neutral-700 hover:text-red-400 text-xs cursor-pointer"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* INLINE EDIT FORM */}
            {isEditing && (
                <form
                    onSubmit={handleSave}
                    className="pb-3 pl-8 space-y-3"
                >
                    <div>
                        <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-transparent border border-neutral-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-400"
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">PRIORITY:</label>
                            <select
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value as any)}
                                className="w-full bg-transparent border border-neutral-700 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-400"
                            >
                                <option value="low" className="bg-neutral-900">low</option>
                                <option value="medium" className="bg-neutral-900">medium</option>
                                <option value="high" className="bg-neutral-900">high</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">DUE DATE:</label>
                            <input
                                type="date"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                                className="w-full bg-transparent border border-neutral-700 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-400"
                            />
                        </div>
                        {members.length > 0 && (
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">ASSIGNED TO:</label>
                                <select
                                    value={editAssignee}
                                    onChange={(e) => setEditAssignee(e.target.value)}
                                    className="w-full bg-transparent border border-neutral-700 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-400"
                                >
                                    <option value="" className="bg-neutral-900">unassigned</option>
                                    {members.map((m) => (
                                        <option key={m.id} value={m.id} className="bg-neutral-900">
                                            {m.displayName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={saving || !editTitle.trim()}
                            className="border border-green-400 px-4 py-1 text-xs text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                        >
                            {saving ? "saving..." : "[ save ]"}
                        </button>
                        <button
                            type="button"
                            onClick={onCancelEdit}
                            className="border border-neutral-700 px-4 py-1 text-xs text-neutral-400 hover:border-neutral-500 cursor-pointer"
                        >
                            cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
