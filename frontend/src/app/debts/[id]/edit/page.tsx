"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import EditDebtForm from "../../components/EditDebtForm";

export default function EditDebtPage() {
    const { id } = useParams<{ id: string }>();
    const { token, isLoading } = useAuth();
    const [debt, setDebt] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !token || !id) return;

        async function load() {
            try {
                const d = await apiFetch<any>(`/api/debts/${id}`, { token });
                setDebt(d);
            } catch (err: any) {
                setError(err.message ?? "Debt not found");
            }
        }

        load();
    }, [token, isLoading, id]);

    if (isLoading || (!debt && !error)) {
        return (
            <section className="p-6 text-white">
                <p className="text-neutral-500 font-mono">loading...</p>
            </section>
        );
    }

    if (error || !debt) {
        return (
            <section className="p-6 text-white">
                <p className="text-red-400">{error ?? "Debt not found"}</p>
            </section>
        );
    }

    return (
        <section className="p-6 text-white">
            <h1 className="text-2xl font-bold mb-4">Edit Debt</h1>
            <EditDebtForm debt={debt} />
        </section>
    );
}
