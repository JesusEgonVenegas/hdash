"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Debt } from "@/types/debt";
import EditPaymentForm from "@/app/payments/components/EditPaymentForm";

export default function EditPaymentPage() {
    const { id } = useParams<{ id: string }>();
    const { token, isLoading } = useAuth();
    const [payment, setPayment] = useState<any>(null);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !token || !id) return;

        async function load() {
            try {
                const [p, d] = await Promise.all([
                    apiFetch<any>(`/api/payments/${id}`, { token }),
                    apiFetch<Debt[]>("/api/debts", { token }),
                ]);
                setPayment(p);
                setDebts(d);
            } catch (err: any) {
                setError(err.message ?? "Failed to load payment");
            }
        }

        load();
    }, [token, isLoading, id]);

    if (isLoading || (!payment && !error)) {
        return (
            <section className="p-6 text-white">
                <p className="text-neutral-500 font-mono">loading...</p>
            </section>
        );
    }

    if (error || !payment) {
        return (
            <section className="p-6 text-white">
                <p className="text-red-400">{error ?? "Payment not found"}</p>
            </section>
        );
    }

    return (
        <section className="p-6 text-white">
            <h1 className="text-xl font-bold mb-4">Edit Payment</h1>
            <EditPaymentForm payment={payment} debts={debts} />
        </section>
    );
}
