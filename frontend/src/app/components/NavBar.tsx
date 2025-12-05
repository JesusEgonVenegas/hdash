// app/components/NavBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
    { href: "/", label: "dashboard" },
    { href: "/debts", label: "debts" },
    { href: "/payments", label: "payments" },
    { href: "/expenses", label: "expenses" }, // placeholder
];

export default function NavBar() {
    const pathname = usePathname();

    return (
        <header className="font-mono text-sm border-b border-neutral-700 bg-neutral-900">
            <nav className="px-4 py-2 flex gap-4">
                {links.map((link) => {
                    const isActive =
                        link.href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(link.href);

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`px-1 ${isActive
                                ? "text-green-400 underline"
                                : "text-neutral-300 hover:text-blue-400"
                                }`}
                        >
                            {link.label}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}

