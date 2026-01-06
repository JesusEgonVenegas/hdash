"use client";

import {
    buildLedgerRows,
    LedgerRow,
    sortLedgerRows,
    SortField,
    SortOrder,
} from "@/lib/payments/ledger";
import { Debt } from "@/types/debt";
import { PaymentApi } from "@/types/payment";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function PaymentsClient({
    payments,
    debts,
}: {
    payments: PaymentApi[];
    debts: Debt[];
}) {
    const router = useRouter();

    const rows = useMemo<LedgerRow[]>(() => {
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
            balanceAfter: 0,
        }));
    }, [payments]);

    const ledgerRows = useMemo(() => buildLedgerRows(rows), [rows]);

    const [filter, setFilter] = useState("ALL");
    const [sortField, setSortField] = useState<SortField>("date");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    const displayRows = useMemo(() => {
        let result = ledgerRows;

        if (filter !== "ALL") {
            result = result.filter((r) => r.debtName === filter);
        }

        result = sortLedgerRows(result, sortOrder, sortField);

        return result;
    }, [ledgerRows, filter, sortField, sortOrder]);

    function toggleSort(field: SortField) {
        setSortField(field);
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
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
                {["ALL", ...debts.map((d) => d.name)].map((name) => (
                    <button
                        key={name}
                        onClick={() => setFilter(name)}
                        className={
                            "px-2 py-0.5 border border-neutral-700 rounded " +
                            (name === filter
                                ? "bg-neutral-800 text-blue-300 underline"
                                : "text-neutral-300 hover:text-white")
                        }
                    >
                        {name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-3 font-bold text-neutral-300">
                <span
                    onClick={() => toggleSort("amount")}
                    className="cursor-pointer"
                >
                    amount {sortField === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
                </span>
                <span
                    onClick={() => toggleSort("date")}
                    className="cursor-pointer"
                >
                    date {sortField === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                </span>
                <span>debt</span>
            </div>

            {displayRows.map((r) => (
                <div
                    key={r.id}
                    className="border-b border-neutral-700 py-1 text-sm cursor-pointer hover:bg-neutral-400/10"
                    onClick={() => router.push(`/payments/${r.id}/edit`)}
                >
                    <div className="grid grid-cols-3">
                        <span className="text-green-400">
                            ${r.amount} payment
                        </span>
                        <span>{r.date}</span>
                        <span className="text-neutral-400">{r.debtName}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

