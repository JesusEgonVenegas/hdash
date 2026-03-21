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
            <section className="space-y-6">
                <div className="border border-neutral-700 p-4">
                    <h1 className="text-lg text-green-400">{"> "}GROCERY LIST</h1>
                </div>
                <p className="text-neutral-500 text-sm">loading...</p>
            </section>
        );
    }

    const uncheckedItems = items.filter((i) => !i.isChecked);
    const checkedItems = items.filter((i) => i.isChecked);

    return (
        <section className="space-y-6">
            <div className="border border-neutral-700 p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg text-green-400">{"> "}GROCERY LIST</h1>
                        <p className="text-neutral-500 text-xs mt-1">
                            {items.length} item{items.length !== 1 ? "s" : ""} · {checkedItems.length} checked
                        </p>
                    </div>
                    {checkedItems.length > 0 && (
                        <button
                            onClick={handleClearChecked}
                            className="ascii-button-danger text-sm"
                        >
                            clear checked
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="ascii-error">
                    [ERROR] {error}
                </div>
            )}

            {/* ADD ITEM */}
            <div className="border border-neutral-700 p-4">
                <form onSubmit={handleAdd} className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="block text-sm text-neutral-400 mb-1">ITEM:</label>
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="eggs, milk, bread..."
                            className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                            autoFocus
                        />
                    </div>
                    <div className="w-20">
                        <label className="block text-sm text-neutral-400 mb-1">QTY:</label>
                        <input
                            value={newQuantity}
                            onChange={(e) => setNewQuantity(e.target.value)}
                            placeholder="1"
                            type="number"
                            min="1"
                            className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={adding || !newName.trim()}
                        className="border border-green-400 py-2 px-4 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                    >
                        {adding ? "..." : "[ ADD ]"}
                    </button>
                </form>
            </div>

            {/* UNCHECKED ITEMS */}
            {uncheckedItems.length === 0 && checkedItems.length === 0 && (
                <div className="border border-neutral-700 p-4 text-neutral-500 text-sm text-center">
                    no items yet — add something above
                </div>
            )}

            {uncheckedItems.length > 0 && (
                <div className="border border-neutral-700 p-4 space-y-1">
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
                <div className="border border-neutral-700 p-4 space-y-1">
                    <div className="text-neutral-500 text-xs mb-2">
                        CHECKED ({checkedItems.length})
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
                    className={`w-5 h-5 border flex-shrink-0 flex items-center justify-center text-xs cursor-pointer ${
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
                className="text-neutral-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-2 cursor-pointer"
            >
                ×
            </button>
        </div>
    );
}
