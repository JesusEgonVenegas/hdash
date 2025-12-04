"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteDebtButton({ id }: { id: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleDelete() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`http://localhost:5063/api/debts/${id}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                throw new Error("Failed to delete debt");
            }

            router.push("/debts");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {!confirming ? (
                <button
                    onClick={() => setConfirming(true)}
                    className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
                >
                    Delete
                </button>
            ) : (
                <div className="flex items-center gap-2">
                    <span>Are you sure?</span>
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading ? "Deleting..." : "Yes"}
                    </button>
                    <button
                        onClick={() => setConfirming(false)}
                        className="bg-gray-600 px-3 py-1 rounded hover:bg-gray-700"
                    >
                        No
                    </button>
                </div>
            )}

            {error && <p className="text-red-400">{error}</p>}
        </div>
    );
}
