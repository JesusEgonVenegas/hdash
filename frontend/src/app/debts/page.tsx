import DebtListClient from "./components/DebtListClient";
import DebtSheet from "./components/DebtSheet";

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
        <section className="text-white font-mono">
            {/* PAGE HEADER */}
            <header className="flex justify-between items-center mb-4 ascii-panel p-4">
                <h1 className="text-xl">debts</h1>

                <nav className="space-x-4">
                    <a href="/debts/simulate" className="ascii-button">simulate</a>
                </nav>
            </header>
            {/* <DebtListClient debts={debts} /> */}
            <DebtSheet initialDebts={debts} />
        </section>
    );
}

