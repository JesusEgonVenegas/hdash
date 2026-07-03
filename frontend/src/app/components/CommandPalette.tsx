"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type Command = { label: string; hint: string; keywords?: string; run: () => void };

const PAGES: { label: string; href: string; keywords?: string }[] = [
    { label: "Today", href: "/today", keywords: "reminders attention" },
    { label: "Dashboard", href: "/", keywords: "home overview" },
    { label: "Grocery list", href: "/grocery", keywords: "shopping food" },
    { label: "Meal plan", href: "/meals", keywords: "food cooking dinner" },
    { label: "Todos", href: "/todos", keywords: "tasks" },
    { label: "Chores", href: "/chores", keywords: "rotation" },
    { label: "Calendar", href: "/calendar", keywords: "events" },
    { label: "Pinboard", href: "/notes", keywords: "notes messages" },
    { label: "Debts", href: "/debts", keywords: "loans money" },
    { label: "Payments", href: "/payments", keywords: "money" },
    { label: "Expenses", href: "/expenses", keywords: "split settle money shared" },
    { label: "Household", href: "/household", keywords: "members invite" },
    { label: "Settings", href: "/settings", keywords: "account password digest profile" },
];

export default function CommandPalette() {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const commands = useMemo<Command[]>(() => {
        const list: Command[] = PAGES.map((p) => ({
            label: p.label,
            hint: "page",
            keywords: `${p.keywords ?? ""} ${p.href}`,
            run: () => router.push(p.href),
        }));
        list.push({ label: "Log out", hint: "action", keywords: "signout exit quit", run: () => logout() });
        return list;
    }, [router, logout]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return commands;
        return commands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q));
    }, [commands, query]);

    // ⌘K / Ctrl+K toggles; a custom event lets the nav chip open it too.
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen((o) => !o);
            } else if (e.key === "Escape") {
                setOpen(false);
            }
        }
        function onOpen() {
            setOpen(true);
        }
        window.addEventListener("keydown", onKey);
        window.addEventListener("hdash:command", onOpen);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("hdash:command", onOpen);
        };
    }, []);

    useEffect(() => {
        if (open) {
            setQuery("");
            setActive(0);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);

    // close on navigation
    useEffect(() => setOpen(false), [pathname]);

    if (!isAuthenticated || !open) return null;

    function onInputKey(e: React.KeyboardEvent) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            filtered[active]?.run();
            setOpen(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-24 px-4"
            onMouseDown={() => setOpen(false)}
        >
            <div
                className="w-full max-w-lg border border-neutral-700 bg-neutral-950 font-mono"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setActive(0);
                    }}
                    onKeyDown={onInputKey}
                    placeholder="jump to… (type to filter)"
                    className="w-full bg-transparent border-b border-neutral-800 px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none text-sm"
                />
                <ul className="max-h-80 overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                        <li className="px-4 py-3 text-neutral-600 text-sm">no matches</li>
                    ) : (
                        filtered.map((c, i) => (
                            <li key={c.label}>
                                <button
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => {
                                        c.run();
                                        setOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left ${
                                        i === active ? "bg-green-400/10 text-green-400" : "text-neutral-300"
                                    }`}
                                >
                                    <span>{c.label}</span>
                                    <span className="text-neutral-600 text-xs">{c.hint}</span>
                                </button>
                            </li>
                        ))
                    )}
                </ul>
                <div className="border-t border-neutral-800 px-4 py-2 text-[11px] text-neutral-600 flex gap-4">
                    <span>↑↓ navigate</span>
                    <span>↵ open</span>
                    <span>esc close</span>
                </div>
            </div>
        </div>
    );
}
