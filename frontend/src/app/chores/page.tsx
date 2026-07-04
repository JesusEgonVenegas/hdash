"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { ChoreItem } from "@/types/chore";
import type { HouseholdMember, Household } from "@/types/household";
import MemberDot from "../components/MemberDot";

const FREQUENCY_LABELS: Record<string, string> = {
    daily: "daily",
    weekly: "weekly",
    biweekly: "every 2 weeks",
    monthly: "monthly",
};

export default function ChoresPage() {
    const { token, user, isLoading } = useAuth();
    const [items, setItems] = useState<ChoreItem[]>([]);
    const [members, setMembers] = useState<HouseholdMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newFrequency, setNewFrequency] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
    const [newAssignee, setNewAssignee] = useState("");
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);

    const loadItems = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiFetch<ChoreItem[]>("/api/chores", { token });
            setItems(data);
            setError(null);
        } catch (err: any) {
            setError(err.message ?? "Failed to load chores");
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
        if (!newName.trim()) return;
        setAdding(true);
        setError(null);

        try {
            const body: any = {
                name: newName.trim(),
                frequency: newFrequency,
            };
            if (newDescription.trim()) body.description = newDescription.trim();
            if (newAssignee) body.assignedToUserId = newAssignee;

            const created = await apiFetch<ChoreItem>("/api/chores", {
                method: "POST",
                body,
                token,
            });
            setItems((prev) => [created, ...prev]);
            setNewName("");
            setNewDescription("");
            setNewFrequency("weekly");
            setNewAssignee("");
            setShowForm(false);
        } catch (err: any) {
            setError(err.data?.error ?? err.message ?? "Failed to add chore");
        } finally {
            setAdding(false);
        }
    }

    async function handleComplete(id: string) {
        try {
            const updated = await apiFetch<ChoreItem>(`/api/chores/${id}/complete`, {
                method: "PUT",
                token,
            });
            setItems((prev) =>
                prev.map((item) => (item.id === id ? updated : item))
            );
        } catch (err: any) {
            setError(err.message ?? "Failed to complete chore");
        }
    }

    async function handleUpdate(id: string, patch: any) {
        try {
            const updated = await apiFetch<ChoreItem>(`/api/chores/${id}`, {
                method: "PUT",
                body: patch,
                token,
            });
            setItems((prev) =>
                prev.map((item) => (item.id === id ? updated : item))
            );
            setEditingId(null);
        } catch (err: any) {
            setError(err.message ?? "Failed to update chore");
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this chore?")) return;
        try {
            await apiFetch(`/api/chores/${id}`, {
                method: "DELETE",
                token,
            });
            setItems((prev) => prev.filter((item) => item.id !== id));
            if (editingId === id) setEditingId(null);
        } catch (err: any) {
            setError(err.message ?? "Failed to delete chore");
        }
    }

    if (isLoading || loading) {
        return (
            <section className="space-y-6">
                <div className="border border-neutral-700 p-4">
                    <h1 className="text-lg text-green-400">{"> "}CHORES</h1>
                </div>
                <p className="text-neutral-500 text-sm">loading...</p>
            </section>
        );
    }

    const dueItems = items.filter((i) => !i.isCompletedThisCycle);
    const completedItems = items.filter((i) => i.isCompletedThisCycle);

    return (
        <section className="space-y-6">
            <div className="border border-neutral-700 p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg text-green-400">{"> "}CHORES</h1>
                        <p className="text-neutral-500 text-xs mt-1">
                            {dueItems.length} active · {completedItems.length} done this cycle
                        </p>
                    </div>
                    <button
                        onClick={() => { setShowForm(!showForm); setEditingId(null); }}
                        className="border border-green-400 py-1 px-3 text-green-400 hover:bg-green-400/10 cursor-pointer text-sm"
                    >
                        {showForm ? "cancel" : "[ + NEW ]"}
                    </button>
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
                            <label className="block text-sm text-neutral-400 mb-1">CHORE NAME:</label>
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="vacuum living room, take out trash..."
                                className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-neutral-400 mb-1">DESCRIPTION (OPTIONAL):</label>
                            <input
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="any extra details..."
                                className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">FREQUENCY:</label>
                                <select
                                    value={newFrequency}
                                    onChange={(e) => setNewFrequency(e.target.value as any)}
                                    className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                                >
                                    <option value="daily" className="bg-neutral-900">daily</option>
                                    <option value="weekly" className="bg-neutral-900">weekly</option>
                                    <option value="biweekly" className="bg-neutral-900">every 2 weeks</option>
                                    <option value="monthly" className="bg-neutral-900">monthly</option>
                                </select>
                            </div>

                            {members.length > 0 && (
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-1">FIRST ASSIGNEE:</label>
                                    <select
                                        value={newAssignee}
                                        onChange={(e) => setNewAssignee(e.target.value)}
                                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                                    >
                                        <option value="" className="bg-neutral-900">me</option>
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
                            disabled={adding || !newName.trim()}
                            className="border border-green-400 py-2 px-6 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                        >
                            {adding ? "Adding..." : "[ ADD CHORE ]"}
                        </button>
                    </form>
                </div>
            )}

            {/* ACTIVE CHORES */}
            {dueItems.length === 0 && completedItems.length === 0 && (
                <div className="border border-neutral-700 p-4 text-neutral-500 text-sm text-center">
                    no chores yet — click &quot;[ + NEW ]&quot; to add one
                </div>
            )}

            {dueItems.length > 0 && (
                <div className="border border-neutral-700 p-4 space-y-1">
                    {dueItems.map((item) => (
                        <ChoreRow
                            key={item.id}
                            item={item}
                            members={members}
                            currentUserId={user?.id}
                            isEditing={editingId === item.id}
                            onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                            onCancelEdit={() => setEditingId(null)}
                            onComplete={handleComplete}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* COMPLETED THIS CYCLE */}
            {completedItems.length > 0 && (
                <div className="border border-neutral-700 p-4 space-y-1">
                    <div className="text-neutral-500 text-xs mb-2">
                        COMPLETED THIS CYCLE ({completedItems.length})
                    </div>
                    {completedItems.map((item) => (
                        <ChoreRow
                            key={item.id}
                            item={item}
                            members={members}
                            currentUserId={user?.id}
                            isEditing={editingId === item.id}
                            onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                            onCancelEdit={() => setEditingId(null)}
                            onComplete={handleComplete}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* ROTATION LEGEND */}
            {members.length > 1 && (
                <div className="border border-neutral-700 p-3">
                    <p className="text-neutral-500 text-xs">
                        when a chore is completed, it automatically rotates to the next household member
                    </p>
                </div>
            )}
        </section>
    );
}

function ChoreRow({
    item,
    members,
    currentUserId,
    isEditing,
    onEdit,
    onCancelEdit,
    onComplete,
    onUpdate,
    onDelete,
}: {
    item: ChoreItem;
    members: HouseholdMember[];
    currentUserId?: string;
    isEditing: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    onComplete: (id: string) => void;
    onUpdate: (id: string, patch: any) => void;
    onDelete: (id: string) => void;
}) {
    const [editName, setEditName] = useState(item.name);
    const [editDescription, setEditDescription] = useState(item.description ?? "");
    const [editFrequency, setEditFrequency] = useState(item.frequency);
    const [editAssignee, setEditAssignee] = useState(item.assignedToUserId ?? "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            setEditName(item.name);
            setEditDescription(item.description ?? "");
            setEditFrequency(item.frequency);
            setEditAssignee(item.assignedToUserId ?? "");
        }
    }, [item, isEditing]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!editName.trim()) return;
        setSaving(true);
        try {
            const patch: any = {
                name: editName.trim(),
                frequency: editFrequency,
            };
            if (editDescription.trim()) patch.description = editDescription.trim();
            if (editAssignee) patch.assignedToUserId = editAssignee;
            else patch.assignedToUserId = null;
            await onUpdate(item.id, patch);
        } finally {
            setSaving(false);
        }
    }

    const isOverdue =
        !item.isCompletedThisCycle &&
        new Date(item.nextDueDate) < new Date();

    const isDueToday =
        !item.isCompletedThisCycle &&
        !isOverdue &&
        new Date(item.nextDueDate).toDateString() === new Date().toDateString();

    const isMyTurn = item.assignedToUserId === currentUserId;

    // Rotation advances to the next member (sorted like the backend). Preview who's up.
    const sorted = [...members].sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id));
    const curIdx = sorted.findIndex((m) => m.id === item.assignedToUserId);
    const upNext = members.length > 1 && curIdx >= 0 ? sorted[(curIdx + 1) % sorted.length] : null;

    return (
        <div className={`border-b border-neutral-800 ${item.isCompletedThisCycle ? "opacity-50" : ""}`}>
            {/* MAIN ROW */}
            <div className="flex items-start justify-between py-2 group">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                        onClick={() => onComplete(item.id)}
                        disabled={item.isCompletedThisCycle}
                        className={`w-5 h-5 border flex-shrink-0 flex items-center justify-center text-xs mt-0.5 cursor-pointer ${
                            item.isCompletedThisCycle
                                ? "border-green-500 text-green-400"
                                : isMyTurn
                                ? "border-green-400 hover:bg-green-400/10"
                                : "border-neutral-600 hover:border-green-400"
                        }`}
                        title={item.isCompletedThisCycle ? "Done this cycle" : "Mark as done"}
                    >
                        {item.isCompletedThisCycle ? "✓" : ""}
                    </button>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span
                                className={`text-sm ${
                                    item.isCompletedThisCycle
                                        ? "line-through text-neutral-500"
                                        : "text-white"
                                }`}
                            >
                                {item.name}
                            </span>
                            <span className="text-xs text-neutral-600">
                                [{FREQUENCY_LABELS[item.frequency]}]
                            </span>
                            {item.streak > 1 && (
                                <span className="text-xs text-orange-400" title={`${item.streak} on-time in a row`}>
                                    🔥 {item.streak}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mt-0.5">
                            <span
                                className={`text-xs ${
                                    isOverdue
                                        ? "text-red-400"
                                        : isDueToday
                                        ? "text-yellow-400"
                                        : "text-neutral-500"
                                }`}
                            >
                                {isOverdue
                                    ? "overdue: "
                                    : isDueToday
                                    ? "due today"
                                    : "due: "}
                                {!isDueToday &&
                                    new Date(item.nextDueDate).toLocaleDateString()}
                            </span>

                            {item.assignedToName && (
                                <span className={`text-xs flex items-center gap-1 ${isMyTurn ? "text-green-400" : "text-neutral-400"}`}>
                                    <MemberDot color={item.assignedToColor} />
                                    {isMyTurn ? "your turn" : item.assignedToName}
                                </span>
                            )}

                            {upNext && !item.isCompletedThisCycle && (
                                <span className="text-xs text-neutral-600 flex items-center gap-1">
                                    next: <MemberDot color={upNext.color} name={upNext.displayName} />
                                </span>
                            )}

                            {item.lastCompletedAt && (
                                <span className="text-xs text-neutral-600">
                                    last: {new Date(item.lastCompletedAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {item.description && !isEditing && (
                            <p className="text-xs text-neutral-600 mt-0.5">
                                {item.description}
                            </p>
                        )}
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
                <form onSubmit={handleSave} className="pb-3 pl-8 space-y-3">
                    <div>
                        <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-transparent border border-neutral-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-400"
                            autoFocus
                        />
                    </div>
                    <div>
                        <input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="description (optional)"
                            className="w-full bg-transparent border border-neutral-700 px-3 py-1.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">FREQUENCY:</label>
                            <select
                                value={editFrequency}
                                onChange={(e) => setEditFrequency(e.target.value as any)}
                                className="w-full bg-transparent border border-neutral-700 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-400"
                            >
                                <option value="daily" className="bg-neutral-900">daily</option>
                                <option value="weekly" className="bg-neutral-900">weekly</option>
                                <option value="biweekly" className="bg-neutral-900">every 2 weeks</option>
                                <option value="monthly" className="bg-neutral-900">monthly</option>
                            </select>
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
                            disabled={saving || !editName.trim()}
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
