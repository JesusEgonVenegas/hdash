import SimulationClient from "../components/SimulationClient";

async function getSimulationData() {
    const res = await fetch("http://localhost:5063/api/simulation", {
        cache: "no-store",
    })

    if (!res.ok) throw new Error("Failed to load simulation data");
    return res.json();
}

export default async function DebtSimulationPage() {

    const debts = await getSimulationData();

    return (
        <main className="text-white p-6 space-y-6">
            <h1 className="text-2xl font-bold">Debt Simulation</h1>
            <SimulationClient debts={debts} />
        </main>
    )
}
