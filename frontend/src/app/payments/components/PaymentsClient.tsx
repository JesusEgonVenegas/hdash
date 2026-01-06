"use client";

import { buildLedgerRows } from "@/lib/payments/ledger";
import { Debt } from "@/types/debt";
import { PaymentApi } from "@/types/payment";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export interface Row {
    id: string;
    amount: number;
    rawDate: string;
    date: string;
    debtName: string
    debtId: string;
    originalAmount: number;
    minPayment: number;
    interestRate: number;
    balanceBefore: number;
    balanceAfter: number;
}

export default function PaymentsClient({ payments, debts }: { payments: PaymentApi[], debts: Debt[] }) {
    const router = useRouter()
    const rows = useMemo<Row[]>(() => {
        return payments.map((p) => ({
            id: p.id,
            amount: p.amount,
            rawDate: p.paidAt,
            date: new Date(p.paidAt).toLocaleDateString(),
            debtName: p.debt?.name ?? "Unknown",
            debtId: p.debt?.id ?? "Unknown",
            originalAmount: p.originalAmount,
            minPayment: p.minPayment,
            interestRate: p.interestRate,
            balanceBefore: 0,
            balanceAfter: 0
        }));
    }, [payments]);
    const [ledgerRows, setLedgerRows] = useState<Row[]>([])
    const [displayRows, setDisplayRows] = useState<Row[]>([]);
    const [sortOrderAmount, setSortOrderAmount] = useState<"asc" | "desc">("asc")
    const [sortOrderDate, setSortOrderDate] = useState<"asc" | "desc">("asc")
    const [currentFilter, setCurrentFilter] = useState("ALL");

    useEffect(() => {
        runningBalance()
        // setDisplayRows(rows)
    }, [rows])

    function filterByDebt(debtName: string) {
        setCurrentFilter(debtName)
        if (debtName === "ALL") {
            setDisplayRows(ledgerRows)
            return
        }
        const filtered = ledgerRows.filter((p) => p.debtName === debtName)
        setDisplayRows(filtered)
    }

    function sortByHeader(sortType: string) {
        if (sortType === "date") {
            const newOrder: "asc" | "desc" =
                sortOrderDate === "asc" ? "desc" : "asc";

            setSortOrderDate(newOrder)
            setDisplayRows(sortRows(displayRows, newOrder, "date"))
            return;
        }
        if (sortType === "amount") {
            const newOrder: "asc" | "desc" =
                sortOrderAmount === "asc" ? "desc" : "asc";

            console.log(newOrder, sortOrderAmount)
            setSortOrderAmount(newOrder)
            setDisplayRows(sortRows(displayRows, newOrder, "amount"))
            return;
        }
    }

    type SortField = "amount" | "date";
    type SortOrder = "asc" | "desc"

    function sortRows(rows: Row[], order: SortOrder, field: SortField): Row[] {
        return [...rows].sort((a, b) => {
            if (field === "amount") {
                return order === "asc"
                    ? a.amount - b.amount
                    : b.amount - a.amount
            }
            const aTime = new Date(a.rawDate).getTime()
            const bTime = new Date(b.rawDate).getTime()
            return order === "asc" ? aTime - bTime : bTime - aTime;
        })
    }

    function runningBalance() {
        const enriched = buildLedgerRows(rows)
        setLedgerRows(enriched)
        setDisplayRows(enriched)
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
                    className="border-b border-neutral-700 py-1 text-sm cursor-pointer hover:bg-neutral-400/10"
                    onClick={() => router.push(`/payments/${r.id}/edit`)}
                >
                    <div className="grid grid-cols-3">
                        <span className="text-green-400" >${r.amount} payment</span>
                        <span >{r.date}</span>
                        <span className="text-neutral-400">{r.debtName}</span>
                    </div>
                    {/* <div className="text-xs text-lime-300 mt-1 pl-2"> */}
                    {/*   went from: ${r.balanceBefore} →  to: ${r.balanceAfter} */}
                    {/* </div> */}
                </div>
            ))}
        </div>
    );
}

