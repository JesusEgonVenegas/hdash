"use client"

import { Debt } from "@/types/debt";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddPaymentForm({ debts }: { debts: Debt[] }) {
  console.log(debts[0].id)
  const router = useRouter()

  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [selectDebtId, setSelectDebtId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: any) {
    e.preventDefault()
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        amount: parseFloat(amount),
        date: date
      }

      const res = await fetch(`http://localhost:5063/api/debts/${selectDebtId}/payments`, {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to create debt");
      }

      router.push("/payments")
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong");
    } finally {
      setIsSubmitting(false);
    };

  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex flex-col">
        <label className="text-sm text-neutral-300 mb-1">amount</label>
        <input type="number" onChange={(e) => setAmount(e.target.value)} />
      </div>

      <div className="flex flex-col">
        <label className="text-sm text-neutral-300 mb-1">date</label>
        <input type="date" onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="flex flex-col">
        <label className="text-sm text-neutral-300 mb-1">debt</label>
        <select
          onChange={(e) => setSelectDebtId(e.target.value)}
        >
          {debts.map((debt) => (
            <option
              key={debt.id}
              value={debt.id}
            >{debt.name}</option>
          ))}
        </select>

      </div>

      <button className="ascii-button mt-2 hover:text-blue-300">save payment</button>

    </form>
  )
}
