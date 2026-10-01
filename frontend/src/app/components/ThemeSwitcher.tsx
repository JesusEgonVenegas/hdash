"use client";

import { THEMES, type Theme } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

function Swatch({ t, selected, onSelect }: { t: Theme; selected: boolean; onSelect: () => void }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            title={t.blurb}
            className={`w-full text-left border p-3 transition-colors ${
                selected ? "border-green-400" : "border-neutral-700 hover:border-neutral-500"
            }`}
        >
            {/* Mini preview rendered in the theme's own colors. */}
            <div
                className="mb-2 flex h-14 items-center gap-2 px-3"
                style={{ background: t.swatch.bg, border: `1px solid ${t.swatch.panel}` }}
            >
                {t.look === "terminal" ? (
                    <>
                        <span className="text-sm font-bold" style={{ color: t.swatch.accent, fontFamily: "monospace" }}>
                            {">"}
                        </span>
                        <span className="text-xs" style={{ color: t.swatch.text, fontFamily: "monospace" }}>
                            [ Save ]
                        </span>
                        <span className="ml-auto inline-block h-4 w-8" style={{ background: t.swatch.accent }} />
                    </>
                ) : (
                    <>
                        {/* filled block button, framed */}
                        <span
                            className="text-[10px] font-bold uppercase tracking-wide px-2 py-1"
                            style={{ background: t.swatch.accent, color: "#fff", border: `2px solid ${t.swatch.text}`, fontFamily: "sans-serif" }}
                        >
                            Save
                        </span>
                        <span className="ml-auto flex items-center gap-1">
                            <span className="inline-block h-3 w-3 rounded-full" style={{ background: t.swatch.accent }} />
                            <span className="inline-block h-3 w-3" style={{ background: t.swatch.text }} />
                        </span>
                    </>
                )}
            </div>
            <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${selected ? "text-green-400" : "text-neutral-300"}`}>
                    {t.name}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-neutral-500 border border-neutral-700 px-1 rounded">
                    {t.mode}
                </span>
                {selected && <span className="text-green-400 text-xs ml-auto">active</span>}
            </div>
        </button>
    );
}

export default function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const groups: Array<"Terminal" | "Bauhaus"> = ["Terminal", "Bauhaus"];

    return (
        <div className="space-y-4">
            {groups.map((g) => (
                <div key={g} className="space-y-2">
                    <div className="text-[11px] uppercase tracking-widest text-neutral-500">{g}</div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {THEMES.filter((t) => t.group === g).map((t) => (
                            <Swatch key={t.id} t={t} selected={t.id === theme} onSelect={() => setTheme(t.id)} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
