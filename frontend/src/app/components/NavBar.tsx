"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

// Daily-use surfaces live in the top bar; account/household lives in the user menu.
const primaryLinks = [
    { href: "/today", label: "today" },
    { href: "/", label: "dashboard" },
    { href: "/grocery", label: "grocery" },
    { href: "/todos", label: "todos" },
    { href: "/chores", label: "chores" },
    { href: "/calendar", label: "calendar" },
    { href: "/notes", label: "notes" },
    { href: "/debts", label: "debts" },
    { href: "/expenses", label: "expenses" },
];

const hideOn = ["/login", "/register", "/onboarding", "/forgot-password", "/reset-password", "/verify-email"];

function isActive(href: string, pathname: string): boolean {
    if (href === "/") return pathname === "/";
    // Debts owns the payments sub-view.
    if (href === "/debts") return pathname.startsWith("/debts") || pathname.startsWith("/payments");
    return pathname.startsWith(href);
}

export default function NavBar() {
    const pathname = usePathname();
    const { user, token, logout, isLoading } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [reminderCount, setReminderCount] = useState(0);
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!token) return;
        apiFetch<{ count: number }>("/api/reminders", { token })
            .then((r) => setReminderCount(r.count))
            .catch(() => setReminderCount(0));
    }, [token, pathname]);

    useEffect(() => {
        if (!userMenuOpen) return;
        function onClick(e: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [userMenuOpen]);

    // Close menus on navigation.
    useEffect(() => {
        setUserMenuOpen(false);
        setMenuOpen(false);
    }, [pathname]);

    if (hideOn.includes(pathname)) return null;
    if (isLoading) return null;

    const badge = (href: string) =>
        href === "/today" && reminderCount > 0 ? (
            <span className="ml-1 text-[10px] text-red-400 align-super">{reminderCount}</span>
        ) : null;

    return (
        <header className="text-sm border-b border-neutral-700">
            <nav className="max-w-4xl mx-auto px-4 sm:px-6 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 sm:gap-6">
                        <Link href="/" className="text-green-400 font-bold text-sm tracking-wider">
                            HDASH
                        </Link>
                        <div className="hidden md:flex gap-3">
                            {primaryLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`px-1 ${
                                        isActive(link.href, pathname)
                                            ? "text-green-400 underline"
                                            : "text-neutral-400 hover:text-white"
                                    }`}
                                >
                                    {link.label}
                                    {badge(link.href)}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Desktop user menu */}
                        {user && (
                            <div className="hidden sm:block relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setUserMenuOpen((o) => !o)}
                                    className="flex items-center gap-2 text-neutral-400 hover:text-white cursor-pointer"
                                >
                                    {user.householdName && (
                                        <span className="text-yellow-400 border border-yellow-600/50 px-1.5 py-0.5 text-xs">
                                            {user.householdName}
                                        </span>
                                    )}
                                    <span className="text-neutral-300">{user.displayName}</span>
                                    <span className="text-neutral-600 text-xs">{userMenuOpen ? "▲" : "▼"}</span>
                                </button>
                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-44 border border-neutral-700 bg-neutral-950 z-20">
                                        <Link href="/household" className="block px-3 py-2 text-neutral-300 hover:bg-neutral-800 hover:text-green-400">
                                            household
                                        </Link>
                                        <Link href="/settings" className="block px-3 py-2 text-neutral-300 hover:bg-neutral-800 hover:text-green-400">
                                            settings
                                        </Link>
                                        <button
                                            onClick={logout}
                                            className="block w-full text-left px-3 py-2 text-neutral-500 hover:bg-neutral-800 hover:text-red-400 cursor-pointer border-t border-neutral-800"
                                        >
                                            [logout]
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="md:hidden text-neutral-400 hover:text-white cursor-pointer"
                        >
                            {menuOpen ? "[×]" : "[≡]"}
                        </button>
                    </div>
                </div>

                {/* Mobile dropdown */}
                {menuOpen && (
                    <div className="md:hidden mt-2 pt-2 border-t border-neutral-800 space-y-1">
                        {primaryLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`block py-1.5 px-2 ${
                                    isActive(link.href, pathname)
                                        ? "text-green-400 underline"
                                        : "text-neutral-400 hover:text-white"
                                }`}
                            >
                                {link.label}
                                {badge(link.href)}
                            </Link>
                        ))}

                        <div className="pt-2 mt-1 border-t border-neutral-800 space-y-1">
                            <Link href="/household" className="block py-1.5 px-2 text-neutral-400 hover:text-white">
                                household
                            </Link>
                            <Link href="/settings" className="block py-1.5 px-2 text-neutral-400 hover:text-white">
                                settings
                            </Link>
                            {user && (
                                <div className="flex items-center justify-between px-2 pt-1">
                                    <div className="flex items-center gap-2">
                                        {user.householdName && (
                                            <span className="text-yellow-400 border border-yellow-600/50 px-1.5 py-0.5 text-xs">
                                                {user.householdName}
                                            </span>
                                        )}
                                        <span className="text-neutral-500 text-xs">{user.displayName}</span>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="text-neutral-600 hover:text-red-400 cursor-pointer text-xs"
                                    >
                                        [logout]
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}
