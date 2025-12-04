"use client";

import { useState } from "react";

export default function DeletePaymentButton({ id }: { id: string }) {
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleDelete() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`http://localhost:5063/api/payments/${id}`, {
                method: "DELETE"
            });

            if (!res.ok) throw new Error("Failed to delete payment");

            // page refresh
            window.location.reload();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="text-right">
            {!confirming ? (
                <button
                    onClick={() => setConfirming(true)}
                    className="text-red-400 hover:text-red-500"
                >
                    Delete
                </button>
            ) : (
                <div className="flex gap-2">
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700"
                    >
                        {loading ? "..." : "Yes"}
                    </button>
                    <button
                        onClick={() => setConfirming(false)}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        No
                    </button>
                </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
    );
}

