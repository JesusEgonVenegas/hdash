import DebtListClient from "./components/DebtListClient";

async function getDebts() {
    const res = await fetch("http://localhost:5063/api/debts", {
        cache: "no-store",
    });

    if (!res.ok) throw new Error("Failed to fetch debts");
    return res.json();
}

export default async function DebtsPage() {
    const debts = await getDebts();

    return (
        <main className="text-white p-6">
            <h1 className="text-2xl font-bold mb-4">Debt List</h1>
            <DebtListClient debts={debts} />
        </main>
    );
}

