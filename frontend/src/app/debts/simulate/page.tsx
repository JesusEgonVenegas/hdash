import SimulationClient from "../components/SimulationClient";

async function getSimulationData() {
    const res = await fetch("http://localhost:5063/api/simulation", {
        cache: "no-store",
    });

    if (!res.ok) throw new Error("Failed to load simulation data");
    return res.json();
}

export default async function DebtSimulationPage() {
    const debts = await getSimulationData();

    return (
        <section className="text-white font-mono space-y-6">
            <header className="ascii-panel p-4">
                <h1 className="text-xl font-bold">Debt Simulation</h1>
            </header>

            <div className="ascii-panel p-4">
                <SimulationClient debts={debts} />
            </div>
        </section>
    );
}

