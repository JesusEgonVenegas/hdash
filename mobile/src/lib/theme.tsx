import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AccentColor = "green" | "cyan" | "orange" | "pink" | "purple" | "amber";
export type FontScale   = "sm" | "md" | "lg";

export interface ThemeConfig {
    accent: AccentColor;
    font:   FontScale;
}

const ACCENT_VALUES: Record<AccentColor, { color: string; dim: string }> = {
    green:  { color: "#4ade80", dim: "rgba(74,222,128,0.12)"  },
    cyan:   { color: "#22d3ee", dim: "rgba(34,211,238,0.12)"  },
    orange: { color: "#fb923c", dim: "rgba(251,146,60,0.12)"  },
    pink:   { color: "#f472b6", dim: "rgba(244,114,182,0.12)" },
    purple: { color: "#a78bfa", dim: "rgba(167,139,250,0.12)" },
    amber:  { color: "#fbbf24", dim: "rgba(251,191,36,0.12)"  },
};

const STORAGE_KEY = "hdash_theme";

function loadTheme(): ThemeConfig {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw) as ThemeConfig;
    } catch { /* ignore */ }
    return { accent: "green", font: "md" };
}

function applyTheme(cfg: ThemeConfig) {
    const root = document.documentElement;
    const { color, dim } = ACCENT_VALUES[cfg.accent];
    root.style.setProperty("--color-accent",     color);
    root.style.setProperty("--color-accent-dim", dim);
    root.classList.remove("font-sm", "font-md", "font-lg");
    root.classList.add(`font-${cfg.font}`);
}

// ─── Context ────────────────────────────────────────────────────────────────

interface ThemeCtx {
    theme: ThemeConfig;
    setAccent: (a: AccentColor) => void;
    setFont:   (f: FontScale)   => void;
    accentHex: string;
    accentDim: string;
    accentOptions: { id: AccentColor; color: string; label: string }[];
}

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemeConfig>(loadTheme);

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    }, [theme]);

    function setAccent(accent: AccentColor) { setTheme(t => ({ ...t, accent })); }
    function setFont(font: FontScale)        { setTheme(t => ({ ...t, font   })); }

    const { color: accentHex, dim: accentDim } = ACCENT_VALUES[theme.accent];

    const accentOptions: ThemeCtx["accentOptions"] = [
        { id: "green",  color: "#4ade80", label: "GREEN"  },
        { id: "cyan",   color: "#22d3ee", label: "CYAN"   },
        { id: "orange", color: "#fb923c", label: "ORANGE" },
        { id: "pink",   color: "#f472b6", label: "PINK"   },
        { id: "purple", color: "#a78bfa", label: "PURPLE" },
        { id: "amber",  color: "#fbbf24", label: "AMBER"  },
    ];

    return (
        <ThemeContext.Provider value={{ theme, setAccent, setFont, accentHex, accentDim, accentOptions }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeCtx {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
    return ctx;
}
