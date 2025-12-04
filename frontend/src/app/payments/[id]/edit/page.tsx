import { notFound } from "next/navigation";
import EditPaymentForm from "@/app/payments/components/EditPaymentForm";

async function getPayment(id: string) {
    const res = await fetch(`http://localhost:5063/api/payments/${id}`, {
        cache: "no-store",
    });

    if (!res.ok) return null;
    return res.json();
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const payment = await getPayment(id);

    if (!payment) return notFound();

    return (
        <main className="p-6 text-white">
            <h1 className="text-xl font-bold mb-4">Edit Payment</h1>
            <EditPaymentForm payment={payment} />
        </main>
    );
}

