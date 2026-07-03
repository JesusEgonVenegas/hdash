"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5063";

type Settings = { digestOptIn: boolean; activeSkin: string; schedulerEnabled: boolean };

export default function SettingsPage() {
    const { token, isLoading, user } = useAuth();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [busy, setBusy] = useState(false);
    const [flash, setFlash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoading || !token) return;
        apiFetch<Settings>("/api/digest/settings", { token })
            .then(setSettings)
            .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    }, [token, isLoading]);

    async function toggleOptIn() {
        if (!settings || !token) return;
        const next = !settings.digestOptIn;
        setSettings({ ...settings, digestOptIn: next });
        try {
            await apiFetch("/api/digest/settings", { token, method: "PUT", body: { digestOptIn: next } });
            flashMsg(next ? "Daily digest on." : "Daily digest off.");
        } catch {
            setSettings({ ...settings, digestOptIn: !next });
            setError("Could not save that.");
        }
    }

    async function preview() {
        if (!token) return;
        setBusy(true);
        try {
            const res = await fetch(`${API_BASE}/api/digest/preview`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const html = await res.text();
            const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
            window.open(url, "_blank");
        } catch {
            setError("Could not build a preview.");
        } finally {
            setBusy(false);
        }
    }

    async function sendTest() {
        if (!token) return;
        setBusy(true);
        try {
            const r = await apiFetch<{ message: string }>("/api/digest/send-test", { token, method: "POST" });
            flashMsg(r.message);
        } catch {
            setError("Could not send the test.");
        } finally {
            setBusy(false);
        }
    }

    function flashMsg(m: string) {
        setError(null);
        setFlash(m);
        setTimeout(() => setFlash(null), 4000);
    }

    if (isLoading || (!settings && !error)) return <p className="text-neutral-500 font-mono">loading...</p>;

    return (
        <section className="space-y-6 font-mono">
            <header className="flex items-baseline justify-between border-b border-neutral-700 pb-2">
                <h1 className="text-green-400 text-lg font-bold tracking-wider">SETTINGS</h1>
                <span className="text-neutral-500 text-sm">{user?.displayName}</span>
            </header>

            {error && <div className="ascii-error text-red-400 text-sm">[ERROR] {error}</div>}
            {flash && <div className="text-green-400 text-sm border border-green-500/30 px-3 py-2">{flash}</div>}

            <div className="border border-neutral-800 p-4 space-y-4">
                <div>
                    <h2 className="text-sm text-neutral-300">{"> "}DAILY DIGEST</h2>
                    <p className="text-neutral-500 text-xs mt-1">
                        A once-a-day email rounding up what needs attention — chores, todos, the day&rsquo;s
                        calendar, the ledger, and the shopping list.
                    </p>
                </div>

                {/* Opt-in toggle */}
                <button
                    onClick={toggleOptIn}
                    className="flex items-center justify-between w-full border border-neutral-700 hover:border-neutral-500 px-3 py-2 text-sm"
                >
                    <span className="text-neutral-300">Email me the daily digest</span>
                    <span className={settings?.digestOptIn ? "text-green-400" : "text-neutral-500"}>
                        {settings?.digestOptIn ? "[ ON ]" : "[ OFF ]"}
                    </span>
                </button>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={preview}
                        disabled={busy}
                        className="border border-green-400/60 text-green-400 hover:bg-green-400/10 px-3 py-1.5 text-sm disabled:opacity-40"
                    >
                        [ PREVIEW ]
                    </button>
                    <button
                        onClick={sendTest}
                        disabled={busy}
                        className="border border-neutral-600 text-neutral-300 hover:border-neutral-400 px-3 py-1.5 text-sm disabled:opacity-40"
                    >
                        [ SEND ME A TEST ]
                    </button>
                </div>

                <div className="text-neutral-600 text-xs border-t border-neutral-800 pt-3 space-y-0.5">
                    <div>skin: <span className="text-neutral-400">{settings?.activeSkin}</span></div>
                    <div>
                        daily delivery:{" "}
                        <span className={settings?.schedulerEnabled ? "text-green-400" : "text-yellow-500"}>
                            {settings?.schedulerEnabled ? "scheduled" : "off (dev — set Digest:Enabled)"}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}
