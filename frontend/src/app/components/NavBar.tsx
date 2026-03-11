"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const links = [
    { href: "/", label: "dashboard" },
    { href: "/household", label: "household" },
    { href: "/grocery", label: "grocery" },
    { href: "/todos", label: "todos" },
    { href: "/chores", label: "chores" },
    { href: "/calendar", label: "calendar" },
    { href: "/debts", label: "debts" },
    { href: "/payments", label: "payments" },
];

export default function NavBar() {
    const pathname = usePathname();
    const { user, logout, isLoading } = useAuth();

    if (pathname === "/login" || pathname === "/register" || pathname === "/onboarding") return null;
    if (isLoading) return null;

    return (
        <header className="text-sm border-b border-neutral-700">
            <nav className="max-w-4xl mx-auto px-6 py-2 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link href="/" className="text-green-400 font-bold text-sm tracking-wider">
                        HDASH
                    </Link>
                    <div className="flex gap-3">
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
                                            : "text-neutral-400 hover:text-white"
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {user && (
                    <div className="flex items-center gap-3 text-sm">
                        {user.householdName && (
                            <span className="text-yellow-400 border border-yellow-600/50 px-1.5 py-0.5 text-xs">
                                {user.householdName}
                            </span>
                        )}
                        <span className="text-neutral-500">
                            {user.displayName}
                        </span>
                        <button
                            onClick={logout}
                            className="text-neutral-600 hover:text-red-400 cursor-pointer"
                        >
                            [logout]
                        </button>
                    </div>
                )}
            </nav>
        </header>
    );
}
