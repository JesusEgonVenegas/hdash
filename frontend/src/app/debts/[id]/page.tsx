import { Debt } from "@/types/debt";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteDebtButton from "../components/DeleteDebtButton";

async function getDebt(id: string) {
    const res = await fetch(`http://localhost:5063/api/debts/${id}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        return null
    }

    return res.json()
}

export default async function DebtDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const debt = await getDebt(id)

    if (!debt) return notFound()

    const mockHistory = [
        { id: 1, date: "2025-01-03", amount: 1000 },
        { id: 2, date: "2025-02-04", amount: 1200 },
    ];

    return (
        <main className="text-white p-6 space-y-6">
            <h1 className="text-2xl font-bold">{debt.name}</h1>

            <div className="bg-gray-800 p-4 rounded space-y-2">
                <p><strong>Balance:</strong> ${debt.amount.toLocaleString()}</p>
                <p><strong>Interest Rate:</strong> {debt.interestRate}% APR</p>
                <p><strong>Min Payment:</strong> ${debt.minPayment.toLocaleString()}</p>
                <p><strong>Due Day:</strong> {debt.dueDay}</p>
            </div>

            <section className="bg-gray-900 p-4 rounded">
                <h2 className="text-xl font-semibold mb-2">Payment History (Mock)</h2>
                <ul className="space-y-2">
                    {mockHistory.map((p) => (
                        <li key={p.id} className="border-b border-gray-700 pb-1">
                            <p><strong>Date:</strong> {p.date}</p>
                            <p><strong>Amount:</strong> ${p.amount}</p>
                        </li>
                    ))}
                </ul>
            </section>

            <div className="flex items-center gap-4">
                <Link
                    href={`/debts/${id}/edit`}
                    className="inline-block bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
                >
                    Edit Debt
                </Link>

                <DeleteDebtButton id={id} />
            </div>
        </main>
    );
}

