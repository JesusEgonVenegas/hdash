import { Debt } from "@/types/debt";
import { notFound } from "next/navigation";

const mockDebts: Debt[] = [
    { id: "1", name: "RappiCard", amount: 28600, interestRate: 90, minPayment: 17763.68, dueDay: 28 },
    { id: "2", name: "Banamex", amount: 18854.43, interestRate: 61, minPayment: 430, dueDay: 4 },
    { id: "3", name: "Nu", amount: 1300, interestRate: 69, minPayment: 100, dueDay: 27 },
];

const mockHistory = [
    { id: 1, date: "2025-01-03", amount: 1000 },
    { id: 2, date: "2025-02-04", amount: 1200 },
];

export default async function DebtDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const debt = mockDebts.find((d) => d.id === id);

    if (!debt) return notFound();

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
        </main>
    );
}

