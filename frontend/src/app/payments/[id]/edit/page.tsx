import { notFound } from "next/navigation";
import EditPaymentForm from "@/app/payments/components/EditPaymentForm";

async function getPayment(id: string) {
    const res = await fetch(`http://localhost:5063/api/payments/${id}`, {
        cache: "no-store",
    });

    if (!res.ok) return null;
    return res.json();
}

async function getDebts() {
    const res = await fetch("http://localhost:5063/api/debts", {
        cache: "no-store"
    })

    if (!res.ok) throw new Error("Failed to load debts")
    return res.json()
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [payment, debts] = await Promise.all([
        getPayment(id),
        getDebts()
    ])

    if (!payment) return notFound();

    return (
        <section className="p-6 text-white">
            <h1 className="text-xl font-bold mb-4">Edit Payment</h1>
            <EditPaymentForm payment={payment} debts={debts} />
        </section>
    );
}

