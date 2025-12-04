import { notFound } from "next/navigation";
import EditDebtForm from "../../components/EditDebtForm";

async function getDebt(id: string) {
    const res = await fetch(`http://localhost:5063/api/debts/${id}`, {
        cache: "no-store",
    });

    if (!res.ok) return null;

    return res.json();
}

export default async function EditDebtPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const debt = await getDebt(id);

    if (!debt) return notFound();

    return (
        <main className="p-6 text-white">
            <h1 className="text-2xl font-bold mb-4">Edit Debt</h1>
            <EditDebtForm debt={debt} />
        </main>
    );
}
