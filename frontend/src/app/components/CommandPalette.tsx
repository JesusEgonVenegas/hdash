"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

type Action = { placeholder: string; submit: (text: string) => Promise<void>; then?: string };
type Command = { label: string; hint: string; keywords?: string; run?: () => void; action?: Action };

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
    const { isAuthenticated, logout, token } = useAuth();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [mode, setMode] = useState<Command | null>(null); // active quick-action
    const [busy, setBusy] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const commands = useMemo<Command[]>(() => {
        const list: Command[] = [
            {
                label: "New note", hint: "action", keywords: "pinboard add write",
                action: {
                    placeholder: "note text…",
                    submit: (t) => apiFetch("/api/notes", { method: "POST", body: { content: t, color: "yellow" }, token }),
                    then: "/notes",
                },
            },
            {
                label: "Add grocery item", hint: "action", keywords: "shopping buy",
                action: {
                    placeholder: "item name…",
                    submit: (t) => apiFetch("/api/grocery", { method: "POST", body: { name: t }, token }),
                    then: "/grocery",
                },
            },
            ...PAGES.map((p) => ({
                label: p.label, hint: "page", keywords: `${p.keywords ?? ""} ${p.href}`,
                run: () => router.push(p.href),
            })),
            { label: "Log out", hint: "action", keywords: "signout exit quit", run: () => logout() },
        ];
        return list;
    }, [router, logout, token]);

    const filtered = useMemo(() => {
        if (mode) return [];
        const q = query.trim().toLowerCase();
        if (!q) return commands;
        return commands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q));
    }, [commands, query, mode]);

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
            setMode(null);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);

    useEffect(() => setOpen(false), [pathname]);

    if (!isAuthenticated || !open) return null;

    function pick(c: Command) {
        if (c.action) {
            setMode(c);
            setQuery("");
            setTimeout(() => inputRef.current?.focus(), 0);
        } else {
            c.run?.();
            setOpen(false);
        }
    }

    async function runAction() {
        if (!mode?.action || !query.trim()) return;
        setBusy(true);
        try {
            await mode.action.submit(query.trim());
            setOpen(false);
            if (mode.action.then) router.push(mode.action.then);
        } catch {
            setBusy(false);
        }
    }

    function onInputKey(e: React.KeyboardEvent) {
        if (mode) {
            if (e.key === "Enter") { e.preventDefault(); runAction(); }
            else if (e.key === "Escape" && query) { e.preventDefault(); setMode(null); setQuery(""); }
            return;
        }
        if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
        else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) pick(filtered[active]); }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-24 px-4" onMouseDown={() => setOpen(false)}>
            <div className="w-full max-w-lg border border-neutral-700 bg-neutral-950 font-mono" onMouseDown={(e) => e.stopPropagation()}>
                {mode && (
                    <div className="px-4 pt-2 text-xs text-green-400">{mode.label} <span className="text-neutral-600">· esc to go back</span></div>
                )}
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                    onKeyDown={onInputKey}
                    placeholder={mode ? mode.action!.placeholder : "jump to… or type a command"}
                    disabled={busy}
                    className="w-full bg-transparent border-b border-neutral-800 px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none text-sm"
                />
                {!mode && (
                    <ul className="max-h-80 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <li className="px-4 py-3 text-neutral-600 text-sm">no matches</li>
                        ) : (
                            filtered.map((c, i) => (
                                <li key={c.label}>
                                    <button
                                        onMouseEnter={() => setActive(i)}
                                        onClick={() => pick(c)}
                                        className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left ${
                                            i === active ? "bg-green-400/10 text-green-400" : "text-neutral-300"
                                        }`}
                                    >
                                        <span>{c.label}</span>
                                        <span className={`text-xs ${c.hint === "action" ? "text-yellow-500/70" : "text-neutral-600"}`}>{c.hint}</span>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                )}
                <div className="border-t border-neutral-800 px-4 py-2 text-[11px] text-neutral-600 flex gap-4">
                    {mode ? <span>↵ save · esc back</span> : <><span>↑↓ navigate</span><span>↵ open</span><span>esc close</span></>}
                </div>
            </div>
        </div>
    );
}
