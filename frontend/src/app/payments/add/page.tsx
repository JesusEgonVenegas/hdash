import AddPaymentForm from "./AddPaymentForm"

async function getDebts() {
  const res = await fetch("http://localhost:5063/api/debts", {
    cache: "no-store"
  })

  if (!res.ok) throw new Error("Failed to load debts")
  return res.json()
}

export default async function AddPaymentPage() {
  const debts = await getDebts()

  return (
    <section className="text-white font-mono space-y-6">
      <header className="ascii-panel p-4">
        <h1 className="text-xl font-bold">Add Payment</h1>
      </header>

      <div className="ascii-panel p-4">
        <AddPaymentForm debts={debts} />
      </div>
    </section>
  )
}
