import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteDebtButton from "../components/DeleteDebtButton";
import AddPaymentForm from "../components/AddPaymentForm";
import DeletePaymentButton from "@/app/debts/components/DeletePaymentButton";

async function getDebt(id: string) {
    const res = await fetch(`http://localhost:5063/api/debts/${id}`, {
        cache: "no-store",
    });

    if (!res.ok) {
        return null
    }

    return res.json()
}

async function getPayments(id: string) {
    const res = await fetch(`http://localhost:5063/api/debts/${id}/payments`, {
        cache: "no-store",
    });

    if (!res.ok) return [];
    return res.json();
}

export default async function DebtDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const debt = await getDebt(id)
    if (!debt) return notFound()
    const payments = await getPayments(id);

    return (
        <main className="text-white p-6 space-y-6">
            <h1 className="text-2xl font-bold">{debt.name}</h1>

            <div className="bg-gray-800 p-4 rounded space-y-2">
                <p><strong>Balance:</strong> ${debt.amount.toLocaleString()}</p>
                <p><strong>Interest Rate:</strong> {debt.interestRate}% APR</p>
                <p><strong>Min Payment:</strong> ${debt.minPayment.toLocaleString()}</p>
                <p><strong>Due Day:</strong> {debt.dueDay}</p>
            </div>

            <AddPaymentForm debtId={id} />

            <section className="bg-gray-900 p-4 rounded">
                <h2 className="text-xl font-semibold mb-2">Payment History (Mock)</h2>
                {payments.length === 0 && <p>No payments yet.</p>}
                <ul className="space-y-2">
                    {payments.map((p: any) => (
                        <li key={p.id} className="border-b border-gray-700 pb-2 flex justify-between">
                            <div>
                                <p><strong>Date:</strong> {new Date(p.paidAt).toLocaleDateString()}</p>
                                <p><strong>Amount:</strong> ${p.amount.toLocaleString()}</p>
                            </div>

                            <DeletePaymentButton id={p.id} />
                            <Link
                                href={`/payments/${p.id}/edit`}
                                className="text-blue-400 hover:text-blue-500 ml-4"
                            >
                                Edit
                            </Link>
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

