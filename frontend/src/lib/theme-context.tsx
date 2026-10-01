"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    type ThemeId,
    type ThemeLook,
    type ThemeMode,
    DEFAULT_THEME,
    getStoredTheme,
    getTheme,
    applyTheme,
} from "./theme";

interface ThemeCtx {
    theme: ThemeId;
    look: ThemeLook;
    mode: ThemeMode;
    setTheme: (id: ThemeId) => void;
}

const Ctx = createContext<ThemeCtx>({
    theme: DEFAULT_THEME,
    look: "terminal",
    mode: "dark",
    setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // SSR + first client render use the default to match server HTML; a no-flash
    // <script> in <head> has already set the real theme on <html>, so colors are
    // correct immediately. This state drives the JS primitives, which reconcile
    // one tick after mount.
    const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

    useEffect(() => {
        setThemeState(getStoredTheme());
    }, []);

    function setTheme(id: ThemeId) {
        setThemeState(id);
        applyTheme(id);
    }

    const meta = getTheme(theme);

    return (
        <Ctx.Provider value={{ theme, look: meta.look, mode: meta.mode, setTheme }}>
            {children}
        </Ctx.Provider>
    );
}

export function useTheme() {
    return useContext(Ctx);
}
