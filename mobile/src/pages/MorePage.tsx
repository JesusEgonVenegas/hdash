import { useState } from "react";
import { Link } from "react-router-dom";
import { exportData, importData, clearAllData } from "../lib/db";
import type { HdashExport } from "../lib/db";
import { useTheme } from "../lib/theme";
import type { AccentColor, FontScale } from "../lib/theme";

const FONT_OPTIONS: { id: FontScale; label: string; size: string }[] = [
    { id: "sm", label: "COMPACT",  size: "12px" },
    { id: "md", label: "DEFAULT",  size: "14px" },
    { id: "lg", label: "LARGE",    size: "16px" },
];

export function MorePage() {
    const { theme, setAccent, setFont, accentOptions } = useTheme();
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

    function flash(text: string, ok = true) {
        setMsg({ text, ok });
        setTimeout(() => setMsg(null), 3000);
    }

    function handleExport() {
        try {
            const data = exportData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = `hdash-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            flash("Backup downloaded.");
        } catch {
            flash("Export failed.", false);
        }
    }

    function handleImport() {
        const input   = document.createElement("input");
        input.type    = "file";
        input.accept  = ".json,application/json";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                importData(JSON.parse(text) as HdashExport);
                flash("Data imported successfully.");
            } catch {
                flash("Import failed — invalid file.", false);
            }
        };
        input.click();
    }

    function handleClear() {
        if (!window.confirm("Delete ALL local data? This cannot be undone.")) return;
        clearAllData();
        flash("All data cleared.");
    }

    return (
        <div className="pb-6">
            {/* header */}
            <div className="page-header">
                <span className="page-title">&gt; MORE</span>
            </div>

            {/* status message */}
            {msg && (
                <div
                    className="mx-4 mt-3 px-3 py-2 text-xs tracking-wider border"
                    style={{ borderColor: msg.ok ? "var(--color-accent)" : "#f87171", color: msg.ok ? "var(--color-accent)" : "#f87171" }}
                >
                    {msg.text}
                </div>
            )}

            {/* ── Pages ────────────────────────────────────────────────────── */}
            <section className="mt-4">
                <div className="px-4 pb-1.5 label">PAGES</div>
                {[
                    { to: "/notes",    emoji: "📝", label: "Notes" },
                    { to: "/budget",   emoji: "💰", label: "Budget" },
                    { to: "/calendar", emoji: "📅", label: "Calendar" },
                    { to: "/debts",    emoji: "💳", label: "Debts" },
                    { to: "/members",  emoji: "👥", label: "Members" },
                ].map(({ to, emoji, label }) => (
                    <Link key={to} to={to}
                        className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)] text-sm active:bg-neutral-900 transition-colors">
                        <span>{emoji}</span>
                        <span className="flex-1">{label}</span>
                        <span className="text-[var(--color-muted)]">›</span>
                    </Link>
                ))}
            </section>

            {/* ── Appearance ───────────────────────────────────────────────── */}
            <section className="mt-6">
                <div className="px-4 pb-1.5 label">APPEARANCE</div>

                {/* Accent color */}
                <div className="border-b border-[var(--color-border)] px-4 py-4">
                    <div className="label mb-3">ACCENT COLOR</div>
                    <div className="flex gap-2.5 flex-wrap">
                        {accentOptions.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => setAccent(opt.id as AccentColor)}
                                className="flex flex-col items-center gap-1.5"
                            >
                                <div
                                    className="w-8 h-8 rounded-full transition-all"
                                    style={{
                                        background: opt.color,
                                        boxShadow: theme.accent === opt.id
                                            ? `0 0 0 2px #0a0a0a, 0 0 0 3px ${opt.color}`
                                            : "none",
                                        opacity: theme.accent === opt.id ? 1 : 0.4,
                                    }}
                                />
                                <span className="text-[9px] tracking-wider" style={{ color: theme.accent === opt.id ? opt.color : "#525252" }}>
                                    {opt.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Font size */}
                <div className="border-b border-[var(--color-border)] px-4 py-4">
                    <div className="label mb-3">TEXT SIZE</div>
                    <div className="flex gap-2">
                        {FONT_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => setFont(opt.id)}
                                className="flex-1 py-2 border transition-colors text-[10px] tracking-wider"
                                style={{
                                    borderColor: theme.font === opt.id ? "var(--color-accent)" : "var(--color-border)",
                                    color: theme.font === opt.id ? "var(--color-accent)" : "var(--color-muted)",
                                    fontSize: opt.size,
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Data ─────────────────────────────────────────────────────── */}
            <section className="mt-6">
                <div className="px-4 pb-1.5 label">DATA</div>
                <button onClick={handleExport}
                    className="flex items-center justify-between w-full px-4 py-3.5 border-b border-[var(--color-border)] text-sm active:bg-neutral-900">
                    Export Backup (JSON)
                    <span className="text-[10px] tracking-widest" style={{ color: "var(--color-accent)" }}>DOWNLOAD</span>
                </button>
                <button onClick={handleImport}
                    className="flex items-center justify-between w-full px-4 py-3.5 border-b border-[var(--color-border)] text-sm active:bg-neutral-900">
                    Import Backup
                    <span className="text-[10px] tracking-widest" style={{ color: "var(--color-accent)" }}>UPLOAD</span>
                </button>
                <button onClick={handleClear}
                    className="flex items-center justify-between w-full px-4 py-3.5 border-b border-[var(--color-border)] text-sm active:bg-neutral-900">
                    Clear All Data
                    <span className="text-[10px] tracking-widest text-red-400">DANGER</span>
                </button>
            </section>

            {/* ── About ────────────────────────────────────────────────────── */}
            <section className="mt-6">
                <div className="px-4 pb-1.5 label">ABOUT</div>
                <div className="px-4 py-3 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold tracking-widest text-sm" style={{ color: "var(--color-accent)" }}>HDASH</span>
                        <span className="text-[10px] text-[var(--color-muted)] border border-[var(--color-border)] px-1.5 py-0.5">v1.0</span>
                    </div>
                    <div className="text-xs text-neutral-500">Household dashboard — local-first, offline.</div>
                    <div className="text-[10px] text-neutral-700 mt-1">All data lives on your device.</div>
                </div>
                <Link to="/privacy"
                    className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] text-xs text-neutral-500 active:bg-neutral-900">
                    Privacy Policy
                    <span className="text-[var(--color-muted)]">›</span>
                </Link>
            </section>
        </div>
    );
}
