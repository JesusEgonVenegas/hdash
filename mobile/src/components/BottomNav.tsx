import { NavLink } from "react-router-dom";

const tabs = [
    { to: "/",        label: "HOME",    icon: "⌂" },
    { to: "/todos",   label: "TODOS",   icon: "✓" },
    { to: "/grocery", label: "SHOP",    icon: "◈" },
    { to: "/chores",  label: "CHORES",  icon: "↻" },
    { to: "/more",    label: "MORE",    icon: "≡" },
];

export function BottomNav() {
    return (
        <nav className="flex border-t border-neutral-800 bg-[#0a0a0a]">
            {tabs.map((tab) => (
                <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.to === "/"}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center flex-1 py-2 gap-0.5 text-[10px] tracking-wider transition-colors ${
                            isActive
                                ? "text-green-400"
                                : "text-neutral-500"
                        }`
                    }
                >
                    <span className="text-base leading-none">{tab.icon}</span>
                    <span>{tab.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
