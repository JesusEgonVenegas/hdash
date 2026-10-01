// App themes. Two axes:
//   - look:  "terminal" (monospace/ASCII) vs "bauhaus" (Jost, filled color blocks)
//   - mode:  "dark" | "light"
// Terminal-look themes use famous developer color palettes (Gruvbox, Solarized,
// Dracula, Nord). Colors come from CSS variable overrides in globals.css keyed
// by html[data-theme="..."]; the `look` drives the UI primitives (components/ui.tsx).

export type ThemeId =
    | "terminal"
    | "gruvbox-dark"
    | "gruvbox-light"
    | "solarized-dark"
    | "solarized-light"
    | "dracula"
    | "nord"
    | "bauhaus-dark"
    | "bauhaus-light";

export type ThemeLook = "terminal" | "bauhaus";
export type ThemeMode = "dark" | "light";

export interface Theme {
    id: ThemeId;
    name: string;
    group: "Terminal" | "Bauhaus";
    look: ThemeLook;
    mode: ThemeMode;
    blurb: string;
    swatch: { bg: string; panel: string; accent: string; text: string };
}

export const THEMES: Theme[] = [
    {
        id: "terminal",
        name: "Classic Green",
        group: "Terminal",
        look: "terminal",
        mode: "dark",
        blurb: "The original green-on-black phosphor.",
        swatch: { bg: "#0a0a0a", panel: "#171717", accent: "#4ade80", text: "#ededed" },
    },
    {
        id: "gruvbox-dark",
        name: "Gruvbox Dark",
        group: "Terminal",
        look: "terminal",
        mode: "dark",
        blurb: "Warm retro. A cult classic.",
        swatch: { bg: "#282828", panel: "#32302f", accent: "#b8bb26", text: "#ebdbb2" },
    },
    {
        id: "gruvbox-light",
        name: "Gruvbox Light",
        group: "Terminal",
        look: "terminal",
        mode: "light",
        blurb: "Cream paper, earthy ink.",
        swatch: { bg: "#fbf1c7", panel: "#f2e5bc", accent: "#79740e", text: "#3c3836" },
    },
    {
        id: "solarized-dark",
        name: "Solarized Dark",
        group: "Terminal",
        look: "terminal",
        mode: "dark",
        blurb: "The precision-tuned teal classic.",
        swatch: { bg: "#002b36", panel: "#073642", accent: "#859900", text: "#93a1a1" },
    },
    {
        id: "solarized-light",
        name: "Solarized Light",
        group: "Terminal",
        look: "terminal",
        mode: "light",
        blurb: "Its famously easy-on-the-eyes twin.",
        swatch: { bg: "#fdf6e3", panel: "#eee8d5", accent: "#728600", text: "#657b83" },
    },
    {
        id: "dracula",
        name: "Dracula",
        group: "Terminal",
        look: "terminal",
        mode: "dark",
        blurb: "Purple-and-pink night mode.",
        swatch: { bg: "#282a36", panel: "#343746", accent: "#bd93f9", text: "#f8f8f2" },
    },
    {
        id: "nord",
        name: "Nord",
        group: "Terminal",
        look: "terminal",
        mode: "dark",
        blurb: "Cool arctic frost.",
        swatch: { bg: "#2e3440", panel: "#3b4252", accent: "#88c0d0", text: "#eceff4" },
    },
    {
        id: "bauhaus-light",
        name: "Bauhaus Light",
        group: "Bauhaus",
        look: "bauhaus",
        mode: "light",
        blurb: "Primary color blocks, thick rules, geometric type.",
        swatch: { bg: "#f3f1ea", panel: "#ffffff", accent: "#2947ba", text: "#1a1a1a" },
    },
    {
        id: "bauhaus-dark",
        name: "Bauhaus Dark",
        group: "Bauhaus",
        look: "bauhaus",
        mode: "dark",
        blurb: "Filled fields on black. Bold and poster-like.",
        swatch: { bg: "#161618", panel: "#202024", accent: "#4f6ff5", text: "#ececec" },
    },
];

const BY_ID = new Map(THEMES.map((t) => [t.id, t]));

export function getTheme(id: ThemeId): Theme {
    return BY_ID.get(id) ?? THEMES[0];
}

export const DEFAULT_THEME: ThemeId = "terminal";
export const THEME_STORAGE_KEY = "hdash-theme";

export function isThemeId(v: unknown): v is ThemeId {
    return typeof v === "string" && BY_ID.has(v as ThemeId);
}

export function getStoredTheme(): ThemeId {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(v) ? v : DEFAULT_THEME;
}

export function applyTheme(id: ThemeId) {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = id;
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
        /* private mode / storage disabled — theme still applies for the session */
    }
}

// Runs before paint to avoid a flash of the default theme. Stringified into a
// blocking <script> in the document <head>. Keep it dependency-free and tiny.
export const NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
)});var ok=${JSON.stringify(
    THEMES.map((t) => t.id),
)}.indexOf(t)>=0;document.documentElement.dataset.theme=ok?t:${JSON.stringify(
    DEFAULT_THEME,
)};}catch(e){document.documentElement.dataset.theme=${JSON.stringify(
    DEFAULT_THEME,
)};}})();`;
