"use client";

import { Debt } from "@/types/debt";

export default function DebtTable({ debts }: { debts: Debt[] }) {
    return (
        <div className="p-4">
            <table className="w-full border border-gray-700 border-collapse">
                <thead>
                    <tr className="bg-neutral-900 text-white">
                        <th className="border px-3 py-2">Name</th>
                        <th className="border px-3 py-2">Amount</th>
                        <th className="border px-3 py-2">Interest Rate</th>
                        <th className="border px-3 py-2">Min Payment</th>
                        <th className="border px-3 py-2">Due Day</th>
                    </tr>
                </thead>

                <tbody>
                    {debts.map((d) => (
                        <tr key={d.id} className="border">
                            <td className="border px-3 py-2">{d.name}</td>
                            <td className="border px-3 py-2">
                                ${d.amount.toLocaleString()}
                            </td>
                            <td className="border px-3 py-2">{d.interestRate}%</td>
                            <td className="border px-3 py-2">
                                ${d.minPayment.toLocaleString()}
                            </td>
                            <td className="border px-3 py-2">{d.dueDay}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

