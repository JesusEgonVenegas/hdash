import { Debt } from "@/types/debt";
import DebtTable from "./components/DebtTable";

export default function DebtsPage() {
    const mockDebts: Debt[] = [
        {
            id: "1",
            name: "RappiCard",
            amount: 28600,
            interestRate: 90,
            minPayment: 17763.68,
            dueDay: 28,
        },
        {
            id: "2",
            name: "Costco Banamex",
            amount: 18854.43,
            interestRate: 61,
            minPayment: 430,
            dueDay: 4,
        },
        {
            id: "3",
            name: "Nu",
            amount: 1300,
            interestRate: 69,
            minPayment: 100,
            dueDay: 27,
        },
    ];
    return (
        <main className="text-white p-6">
            <h1 className="text-2xl font-bold mb-4">Debt List</h1>
            <DebtTable debts={mockDebts} />
            <a href="/debts/add">Add New Debt</a>
        </main>
    )
}

