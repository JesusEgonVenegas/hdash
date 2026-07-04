"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
    { href: "/debts", label: "debts" },
    { href: "/payments", label: "payments" },
    { href: "/expenses", label: "expenses" },
];

/** Tab bar unifying the money section: debts + payments (personal) + expenses (shared). */
export default function DebtsTabs() {
    const pathname = usePathname();
    return (
        <div className="flex gap-1 border-b border-neutral-800">
            {tabs.map((t) => {
                const active = pathname.startsWith(t.href);
                return (
                    <Link
                        key={t.href}
                        href={t.href}
                        className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                            active
                                ? "border-green-400 text-green-400"
                                : "border-transparent text-neutral-500 hover:text-neutral-300"
                        }`}
                    >
                        {t.label}
                    </Link>
                );
            })}
        </div>
    );
}
