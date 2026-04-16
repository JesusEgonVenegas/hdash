import { NavLink } from "react-router-dom";

const tabs = [
    { to: "/",        label: "HOME",   icon: "⌂" },
    { to: "/todos",   label: "TODOS",  icon: "✓" },
    { to: "/grocery", label: "SHOP",   icon: "◈" },
    { to: "/chores",  label: "CHORES", icon: "↻" },
    { to: "/more",    label: "MORE",   icon: "≡" },
];

export function BottomNav() {
    return (
        <nav
            className="flex border-t border-[var(--color-border)] bg-[#0a0a0a]"
            style={{ borderTopColor: "var(--color-border)" }}
        >
            {tabs.map((tab) => (
                <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.to === "/"}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center flex-1 py-2.5 gap-1 text-[9px] tracking-widest transition-colors select-none ${
                            isActive
                                ? "text-accent"
                                : "text-[var(--color-muted)]"
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <span
                                className={`text-base leading-none transition-all ${isActive ? "accent-glow" : ""}`}
                                style={isActive ? { color: "var(--color-accent)" } : undefined}
                            >
                                {tab.icon}
                            </span>
                            <span style={isActive ? { color: "var(--color-accent)" } : undefined}>
                                {tab.label}
                            </span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}
