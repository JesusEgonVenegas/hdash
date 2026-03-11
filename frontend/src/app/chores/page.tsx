"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { ChoreItem } from "@/types/chore";
import type { HouseholdMember, Household } from "@/types/household";

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

    // add form
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newFrequency, setNewFrequency] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
    const [newAssignee, setNewAssignee] = useState("");
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

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

    async function handleDelete(id: string) {
        if (!confirm("Delete this chore?")) return;
        try {
            await apiFetch(`/api/chores/${id}`, {
                method: "DELETE",
                token,
            });
            setItems((prev) => prev.filter((item) => item.id !== id));
        } catch (err: any) {
            setError(err.message ?? "Failed to delete chore");
        }
    }

    if (isLoading || loading) {
        return (
            <section className="text-white font-mono p-6">
                <p className="text-neutral-500">loading...</p>
            </section>
        );
    }

    const dueItems = items.filter((i) => !i.isCompletedThisCycle);
    const completedItems = items.filter((i) => i.isCompletedThisCycle);

    return (
        <section className="text-white font-mono space-y-6">
            <header className="ascii-panel p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold">Chores</h1>
                        <p className="text-neutral-500 text-xs mt-1">
                            {dueItems.length} active · {completedItems.length} done this cycle
                        </p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="ascii-button text-sm"
                    >
                        {showForm ? "cancel" : "+ new"}
                    </button>
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
                            <label className="block text-neutral-500 text-xs mb-1">chore name</label>
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="vacuum living room, take out trash..."
                                className="w-full bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm focus:outline-none focus:border-green-400"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-neutral-500 text-xs mb-1">description (optional)</label>
                            <input
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="any extra details..."
                                className="w-full bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm focus:outline-none focus:border-green-400"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-neutral-500 text-xs mb-1">frequency</label>
                                <select
                                    value={newFrequency}
                                    onChange={(e) => setNewFrequency(e.target.value as any)}
                                    className="w-full bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm focus:outline-none"
                                >
                                    <option value="daily">daily</option>
                                    <option value="weekly">weekly</option>
                                    <option value="biweekly">every 2 weeks</option>
                                    <option value="monthly">monthly</option>
                                </select>
                            </div>

                            {members.length > 0 && (
                                <div>
                                    <label className="block text-neutral-500 text-xs mb-1">first assignee</label>
                                    <select
                                        value={newAssignee}
                                        onChange={(e) => setNewAssignee(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm focus:outline-none"
                                    >
                                        <option value="">me</option>
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
                            disabled={adding || !newName.trim()}
                            className="ascii-button text-sm disabled:opacity-50"
                        >
                            {adding ? "..." : "add chore"}
                        </button>
                    </form>
                </div>
            )}

            {/* ACTIVE CHORES */}
            {dueItems.length === 0 && completedItems.length === 0 && (
                <div className="ascii-panel p-4 text-neutral-500 text-sm text-center">
                    no chores yet — click &quot;+ new&quot; to add one
                </div>
            )}

            {dueItems.length > 0 && (
                <div className="ascii-panel p-4 space-y-1">
                    {dueItems.map((item) => (
                        <ChoreRow
                            key={item.id}
                            item={item}
                            currentUserId={user?.id}
                            onComplete={handleComplete}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* COMPLETED THIS CYCLE */}
            {completedItems.length > 0 && (
                <div className="ascii-panel p-4 space-y-1">
                    <div className="text-neutral-500 text-xs mb-2">
                        completed this cycle ({completedItems.length})
                    </div>
                    {completedItems.map((item) => (
                        <ChoreRow
                            key={item.id}
                            item={item}
                            currentUserId={user?.id}
                            onComplete={handleComplete}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* ROTATION LEGEND */}
            {members.length > 1 && (
                <div className="ascii-panel p-3">
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
    currentUserId,
    onComplete,
    onDelete,
}: {
    item: ChoreItem;
    currentUserId?: string;
    onComplete: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const isOverdue =
        !item.isCompletedThisCycle &&
        new Date(item.nextDueDate) < new Date();

    const isDueToday =
        !item.isCompletedThisCycle &&
        !isOverdue &&
        new Date(item.nextDueDate).toDateString() === new Date().toDateString();

    const isMyTurn = item.assignedToUserId === currentUserId;

    return (
        <div
            className={`flex items-start justify-between py-2 border-b border-neutral-800 group ${
                item.isCompletedThisCycle ? "opacity-50" : ""
            }`}
        >
            <div className="flex items-start gap-3 flex-1 min-w-0">
                <button
                    onClick={() => onComplete(item.id)}
                    disabled={item.isCompletedThisCycle}
                    className={`w-5 h-5 border flex-shrink-0 flex items-center justify-center text-xs mt-0.5 ${
                        item.isCompletedThisCycle
                            ? "border-green-500 text-green-400"
                            : isMyTurn
                            ? "border-green-400 hover:bg-green-900"
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
                            <span
                                className={`text-xs ${
                                    isMyTurn ? "text-green-400" : "text-blue-400"
                                }`}
                            >
                                {isMyTurn ? "» your turn" : `@${item.assignedToName}`}
                            </span>
                        )}

                        {item.lastCompletedAt && (
                            <span className="text-xs text-neutral-600">
                                last: {new Date(item.lastCompletedAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>

                    {item.description && (
                        <p className="text-xs text-neutral-600 mt-0.5">
                            {item.description}
                        </p>
                    )}
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
