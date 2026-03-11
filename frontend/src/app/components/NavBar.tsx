"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const links = [
    { href: "/", label: "dashboard" },
    { href: "/debts", label: "debts" },
    { href: "/payments", label: "payments" },
    { href: "/grocery", label: "grocery" },
    { href: "/household", label: "household" },
];

export default function NavBar() {
    const pathname = usePathname();
    const { user, logout, isLoading } = useAuth();

    if (pathname === "/login" || pathname === "/register") return null;
    if (isLoading) return null;

    return (
        <header className="font-mono text-sm border-b border-neutral-700 bg-neutral-900">
            <nav className="px-4 py-2 flex items-center justify-between">
                <div className="flex gap-4">
                    {links.map((link) => {
                        const isActive =
                            link.href === "/"
                                ? pathname === "/"
                                : pathname.startsWith(link.href);

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-1 ${
                                    isActive
                                        ? "text-green-400 underline"
                                        : "text-neutral-300 hover:text-blue-400"
                                }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </div>

                {user && (
                    <div className="flex items-center gap-3 text-sm">
                        {user.householdName && (
                            <span className="text-yellow-400 border border-yellow-600 px-1.5 py-0.5 text-xs">
                                {user.householdName}
                            </span>
                        )}
                        <span className="text-neutral-400">
                            {user.displayName}
                        </span>
                        <button
                            onClick={logout}
                            className="text-neutral-500 hover:text-red-400 cursor-pointer"
                        >
                            [logout]
                        </button>
                    </div>
                )}
            </nav>
        </header>
    );
}
