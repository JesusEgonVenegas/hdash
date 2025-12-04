import DashboardClient from "./components/DashboardClient";

async function getDashboardData() {
    const debtsRes = await fetch("http://localhost:5063/api/debts", { cache: "no-store" });
    const paymentsRes = await fetch("http://localhost:5063/api/payments?limit=5", { cache: "no-store" });

    return {
        debts: debtsRes.ok ? await debtsRes.json() : [],
        payments: paymentsRes.ok ? await paymentsRes.json() : []
    };
}

export default async function DashboardPage() {
    const data = await getDashboardData();

    return (
        <main className="p-8 text-white space-y-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <DashboardClient data={data} />
        </main>
    );
}

