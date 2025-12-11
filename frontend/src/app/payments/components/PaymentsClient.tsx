"use client";

import { Debt } from "@/types/debt";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function PaymentsClient({ payments, debts }: { payments: any[], debts: Debt[] }) {
  const router = useRouter()
  const rows = useMemo(() => {
    return payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      rawDate: p.paidAt,
      date: new Date(p.paidAt).toLocaleDateString(),
      debt: {
        name: p.debt?.name ?? "Unknown"
      }
    }));
  }, [payments]);
  const [displayRows, setDisplayRows] = useState(rows);
  const [sortOrderAmount, setSortOrderAmount] = useState<"asc" | "desc">("asc")
  const [sortOrderDate, setSortOrderDate] = useState<"asc" | "desc">("asc")
  const [currentFilter, setCurrentFilter] = useState("ALL");

  useEffect(() => {
    setDisplayRows(rows)
  }, [rows])

  function filterByDebt(debtName: string) {
    setCurrentFilter(debtName)
    if (debtName === "ALL") {
      setDisplayRows(rows)
      return
    }
    const filtered = rows.filter((p) => p.debt.name === debtName)
    setDisplayRows(filtered)
  }

  function sortByHeader(sortType: string) {
    let newOrder: "asc" | "desc" = "asc";

    if (sortType === "amount") {
      newOrder = sortOrderAmount === "asc" ? "desc" : "asc";
      setSortOrderAmount(newOrder)
      const sorted = [...displayRows].sort((a, b) => {
        return newOrder === "asc"
          ? a.amount - b.amount
          : b.amount - a.amount
      });
      setDisplayRows(sorted)
      return;
    }
    if (sortType === "date") {
      newOrder = sortOrderDate === "asc" ? "desc" : "asc";
      setSortOrderDate(newOrder)
      const sorted = [...displayRows].sort((a, b) => {
        const aTime = new Date(a.rawDate).getTime()
        const bTime = new Date(b.rawDate).getTime()
        return newOrder === "asc"
          ? aTime - bTime
          : bTime - aTime
      });
      setDisplayRows(sorted)
      return;
    }

  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => router.push("/payments/add")}
        className="ascii-button mb-3"
      >
        add payment
      </button>
      <div className="ascii-panel p-2 mb-3 flex flex-wrap gap-2 text-sm font-mono">
        <span className="text-neutral-400 mr-2">
          {["ALL", ...debts.map((d) => d.name)].map((name) => (
            <button
              key={name}
              onClick={() => filterByDebt(name)}
              className={
                "px-2 py-0.5 border border-neutral-700 rounded " +
                (name === currentFilter
                  ? "bg-neutral-800 text-blue-300 underline"
                  : "text-neutral-300 hover:text-white")
              }
            >{name}</button>
          ))}
        </span>
      </div>
      <div className="grid grid-cols-3 font-bold text-neutral-300">
        <span onClick={() => sortByHeader("amount")} className="cursor-pointer">amount {sortOrderAmount === "asc" ? "↑" : "↓"}</span>
        <span onClick={() => sortByHeader("date")} className="cursor-pointer">date {sortOrderDate === "asc" ? "↑" : "↓"}</span>
        <span>debt</span>
      </div>

      {displayRows.map((r) => (
        <div
          key={r.id}
          className="grid grid-cols-3 border-b border-neutral-700 py-1 text-sm"
          onClick={() => router.push(`/payments/${r.id}/edit`)}
        >
          <span className="text-green-400" >${r.amount}</span>
          <span >{r.date}</span>
          <span className="text-neutral-400">{r.debt.name}</span>
        </div>
      ))}
    </div>
  );
}

