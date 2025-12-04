"use client";

import { Debt } from "@/types/debt";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DebtListClient({ debts }: { debts: Debt[] }) {
    const router = useRouter();

    return (
        <section className="ascii-panel font-mono text-sm">

            <h2 className="ascii-heading mb-3">debts</h2>

            {/* Header */}
            <div className="ascii-table-header">
                <span className="w-32">name</span>
                <span className="w-24">balance</span>
                <span className="w-20">apr</span>
                <span className="w-24">min_payment</span>
                <span className="w-16">due</span>
            </div>

            {/* Rows */}
            {debts.map((d) => (
                <div
                    key={d.id}
                    className="ascii-table-row hover:bg-neutral-800 cursor-pointer"
                    onClick={() => router.push(`/debts/${d.id}`)}
                    tabIndex={0}
                    onKeyDown={(e) =>
                        e.key === "Enter" && router.push(`/debts/${d.id}`)
                    }
                >
                    <span className="w-32 text-blue-400">{d.name}</span>
                    <span className="w-24">${d.amount.toLocaleString()}</span>
                    <span className="w-20">{d.interestRate}%</span>
                    <span className="w-24">${d.minPayment.toLocaleString()}</span>
                    <span className="w-16">day {d.dueDay}</span>
                </div>
            ))}

            {debts.length === 0 && (
                <p className="text-neutral-500 mt-3">no debts found</p>
            )}

            <Link
                href="/debts/add"
                className="block mt-6 border border-neutral-700 px-3 py-2 rounded text-center hover:bg-neutral-800"
            >
                + add_new_debt
            </Link>
        </section>
    );
}

