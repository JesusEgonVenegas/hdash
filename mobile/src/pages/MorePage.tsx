import { useState } from "react";
import { Link } from "react-router-dom";
import { exportData, importData, clearAllData } from "../lib/db";
import type { HdashExport } from "../lib/db";

export function MorePage() {
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
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `hdash-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            flash("Backup downloaded.");
        } catch {
            flash("Export failed.", false);
        }
    }

    function handleImport() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text) as HdashExport;
                importData(data);
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
        <div>
            <div className="px-4 pt-4 pb-2 border-b border-neutral-800">
                <span className="text-green-400 font-bold tracking-widest text-sm">&gt; MORE</span>
            </div>

            {/* Status message */}
            {msg && (
                <div className={`mx-4 mt-3 px-3 py-2 text-xs tracking-wider border ${msg.ok ? "border-green-400 text-green-400" : "border-red-400 text-red-400"}`}>
                    {msg.text}
                </div>
            )}

            {/* Navigation shortcuts */}
            <section className="mt-4">
                <div className="px-4 py-1 text-[10px] text-neutral-500 tracking-widest">PAGES</div>
                {[
                    { to: "/calendar", label: "Calendar" },
                    { to: "/debts", label: "Debts" },
                ].map(({ to, label }) => (
                    <Link key={to} to={to}
                        className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 text-sm text-neutral-200 active:bg-neutral-900">
                        {label}
                        <span className="text-neutral-600">›</span>
                    </Link>
                ))}
            </section>

            {/* Data management */}
            <section className="mt-4">
                <div className="px-4 py-1 text-[10px] text-neutral-500 tracking-widest">DATA</div>
                <button onClick={handleExport}
                    className="flex items-center justify-between w-full px-4 py-3 border-b border-neutral-800 text-sm text-neutral-200 active:bg-neutral-900 text-left">
                    Export Backup (JSON)
                    <span className="text-[10px] text-green-400">DOWNLOAD</span>
                </button>
                <button onClick={handleImport}
                    className="flex items-center justify-between w-full px-4 py-3 border-b border-neutral-800 text-sm text-neutral-200 active:bg-neutral-900 text-left">
                    Import Backup
                    <span className="text-[10px] text-green-400">UPLOAD</span>
                </button>
                <button onClick={handleClear}
                    className="flex items-center justify-between w-full px-4 py-3 border-b border-neutral-800 text-sm text-neutral-200 active:bg-neutral-900 text-left">
                    Clear All Data
                    <span className="text-[10px] text-red-400">DANGER</span>
                </button>
            </section>

            {/* About */}
            <section className="mt-4">
                <div className="px-4 py-1 text-[10px] text-neutral-500 tracking-widest">ABOUT</div>
                <div className="px-4 py-3 border-b border-neutral-800">
                    <div className="text-sm text-neutral-200">HDASH</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">Household dashboard — local-first, offline-ready.</div>
                    <div className="text-[10px] text-neutral-600 mt-1">All data is stored on your device only.</div>
                </div>
            </section>
        </div>
    );
}
