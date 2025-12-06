import PaymentsClient from "./components/PaymentsClient";

async function getPayments() {
    const res = await fetch("http://localhost:5063/api/payments?limit=200", {
        cache: "no-store",
    });

    if (!res.ok) throw new Error("Failed to fetch payments");
    return res.json();
}

export default async function PaymentsPage() {
    const payments = await getPayments();

    return (
        <section className="text-white font-mono space-y-6">
            <header className="ascii-panel p-4">
                <h1 className="text-xl font-bold">Payment History</h1>
            </header>

            <div className="ascii-panel p-4">
                <PaymentsClient payments={payments} />
            </div>
        </section>
    );
}

