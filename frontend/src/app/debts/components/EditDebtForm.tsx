"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Debt } from "@/types/debt";

export default function EditDebtForm({ debt }: { debt: Debt }) {
  const router = useRouter();
  const { token } = useAuth();
  const [name, setName] = useState(debt.name);
  const [amount, setAmount] = useState(String(debt.startingAmount));
  const [interestRate, setInterestRate] = useState(String(debt.interestRate));
  const [minPayment, setMinPayment] = useState(String(debt.minPayment));
  const [dueDay, setDueDay] = useState(String(debt.dueDay));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name,
        startingAmount: parseFloat(amount),
        interestRate: parseFloat(interestRate),
        minPayment: parseFloat(minPayment),
        dueDay: parseInt(dueDay),
      };

      await apiFetch(`/api/debts/${debt.id}`, {
        method: "PUT",
        body: payload,
        token,
      });

      router.push(`/debts/${debt.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ascii-panel space-y-4 max-w-md">
      <div>
        <label className="block text-neutral-500 text-xs mb-1">Name</label>
        <input
          className="ascii-input w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-neutral-500 text-xs mb-1">Amount</label>
        <input
          className="ascii-input w-full"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-neutral-500 text-xs mb-1">Interest Rate</label>
        <input
          className="ascii-input w-full"
          value={interestRate}
          onChange={(e) => setInterestRate(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-neutral-500 text-xs mb-1">Min Payment</label>
        <input
          className="ascii-input w-full"
          value={minPayment}
          onChange={(e) => setMinPayment(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-neutral-500 text-xs mb-1">Due Day</label>
        <input
          className="ascii-input w-full"
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
        />
      </div>

      <button
        disabled={isSubmitting}
        className="ascii-button py-1 px-4 disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Save Changes"}
      </button>

      {error && <p className="text-red-400">{error}</p>}
    </form>
  );
}

