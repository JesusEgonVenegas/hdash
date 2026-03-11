"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { GroceryItem } from "@/types/grocery";

export default function GroceryPage() {
    const { token, user, isLoading } = useAuth();
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // add form
    const [newName, setNewName] = useState("");
    const [newQuantity, setNewQuantity] = useState("");
    const [adding, setAdding] = useState(false);

    const loadItems = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiFetch<GroceryItem[]>("/api/grocery", { token });
            setItems(data);
            setError(null);
        } catch (err: any) {
            setError(err.message ?? "Failed to load grocery list");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (isLoading || !token) return;
        loadItems();
    }, [token, isLoading, loadItems]);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!newName.trim()) return;
        setAdding(true);
        setError(null);

        try {
            const created = await apiFetch<GroceryItem>("/api/grocery", {
                method: "POST",
                body: {
                    name: newName.trim(),
                    quantity: parseInt(newQuantity) || 1,
                },
                token,
            });
            setItems((prev) => [created, ...prev]);
            setNewName("");
            setNewQuantity("");
        } catch (err: any) {
            setError(err.data?.error ?? err.message ?? "Failed to add item");
        } finally {
            setAdding(false);
        }
    }

    async function handleToggle(id: string) {
        try {
            const updated = await apiFetch<GroceryItem>(`/api/grocery/${id}/toggle`, {
                method: "PUT",
                token,
            });
            setItems((prev) =>
                prev.map((item) => (item.id === id ? updated : item))
            );
        } catch (err: any) {
            setError(err.message ?? "Failed to toggle item");
        }
    }

    async function handleDelete(id: string) {
        try {
            await apiFetch(`/api/grocery/${id}`, {
                method: "DELETE",
                token,
            });
            setItems((prev) => prev.filter((item) => item.id !== id));
        } catch (err: any) {
            setError(err.message ?? "Failed to delete item");
        }
    }

    async function handleClearChecked() {
        if (!confirm("Remove all checked items?")) return;

        try {
            await apiFetch("/api/grocery/checked", {
                method: "DELETE",
                token,
            });
            setItems((prev) => prev.filter((item) => !item.isChecked));
        } catch (err: any) {
            setError(err.message ?? "Failed to clear items");
        }
    }

    if (isLoading || loading) {
        return (
            <section className="text-white font-mono p-6">
                <p className="text-neutral-500">loading...</p>
            </section>
        );
    }

    const uncheckedItems = items.filter((i) => !i.isChecked);
    const checkedItems = items.filter((i) => i.isChecked);

    return (
        <section className="text-white font-mono space-y-6">
            <header className="ascii-panel p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold">Grocery List</h1>
                        <p className="text-neutral-500 text-xs mt-1">
                            {items.length} item{items.length !== 1 ? "s" : ""} ·{" "}
                            {checkedItems.length} checked
                        </p>
                    </div>
                    {checkedItems.length > 0 && (
                        <button
                            onClick={handleClearChecked}
                            className="text-neutral-400 hover:text-red-400 text-sm border border-neutral-600 px-2 py-1"
                        >
                            clear checked
                        </button>
                    )}
                </div>
            </header>

            {error && (
                <div className="ascii-panel p-3 border-red-500 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* ADD ITEM */}
            <div className="ascii-panel p-4">
                <form onSubmit={handleAdd} className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="block text-neutral-500 text-xs mb-1">item</label>
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="eggs, milk, bread..."
                            className="w-full bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm focus:outline-none focus:border-green-400"
                            autoFocus
                        />
                    </div>
                    <div className="w-20">
                        <label className="block text-neutral-500 text-xs mb-1">qty</label>
                        <input
                            value={newQuantity}
                            onChange={(e) => setNewQuantity(e.target.value)}
                            placeholder="1"
                            type="number"
                            min="1"
                            className="w-full bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm focus:outline-none focus:border-green-400"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={adding || !newName.trim()}
                        className="ascii-button text-sm disabled:opacity-50 mb-0"
                    >
                        {adding ? "..." : "add"}
                    </button>
                </form>
            </div>

            {/* UNCHECKED ITEMS */}
            {uncheckedItems.length === 0 && checkedItems.length === 0 && (
                <div className="ascii-panel p-4 text-neutral-500 text-sm text-center">
                    no items yet — add something above
                </div>
            )}

            {uncheckedItems.length > 0 && (
                <div className="ascii-panel p-4 space-y-1">
                    {uncheckedItems.map((item) => (
                        <GroceryRow
                            key={item.id}
                            item={item}
                            currentUserId={user?.id}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* CHECKED ITEMS */}
            {checkedItems.length > 0 && (
                <div className="ascii-panel p-4 space-y-1">
                    <div className="text-neutral-500 text-xs mb-2">
                        checked ({checkedItems.length})
                    </div>
                    {checkedItems.map((item) => (
                        <GroceryRow
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

function GroceryRow({
    item,
    currentUserId,
    onToggle,
    onDelete,
}: {
    item: GroceryItem;
    currentUserId?: string;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <div
            className={`flex items-center justify-between py-1.5 border-b border-neutral-800 group ${
                item.isChecked ? "opacity-50" : ""
            }`}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                    onClick={() => onToggle(item.id)}
                    className={`w-5 h-5 border flex-shrink-0 flex items-center justify-center text-xs ${
                        item.isChecked
                            ? "border-green-500 text-green-400"
                            : "border-neutral-600 hover:border-green-400"
                    }`}
                >
                    {item.isChecked ? "✓" : ""}
                </button>

                <span
                    className={`text-sm truncate ${
                        item.isChecked
                            ? "line-through text-neutral-500"
                            : "text-white"
                    }`}
                >
                    {item.name}
                </span>

                {item.quantity > 1 && (
                    <span className="text-neutral-400 text-xs flex-shrink-0">
                        ×{item.quantity}
                    </span>
                )}

                {item.userName && item.userId !== currentUserId && (
                    <span className="text-neutral-600 text-xs flex-shrink-0">
                        {item.userName}
                    </span>
                )}
            </div>

            <button
                onClick={() => onDelete(item.id)}
                className="text-neutral-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-2"
            >
                ×
            </button>
        </div>
    );
}
