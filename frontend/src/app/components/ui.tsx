"use client";

// Theme-aware UI primitives. They render a different design language depending
// on the active theme's `look`: "terminal" (monospace, sharp, hairline-outlined,
// bracketed) vs "bauhaus" (Jost geometric type, thick ink frames, FILLED color
// blocks, primary-color markers). Colors come from the palette variables; filled
// blocks that need true white use a literal #fff so the light theme's white->ink
// override doesn't darken them.

import { useTheme } from "@/lib/theme-context";

type Div = React.HTMLAttributes<HTMLDivElement>;
type Btn = React.ButtonHTMLAttributes<HTMLButtonElement>;
type Inp = React.InputHTMLAttributes<HTMLInputElement>;

function cx(...parts: (string | false | undefined)[]) {
    return parts.filter(Boolean).join(" ");
}

/** Section container. Terminal: thin sharp border. Bauhaus: thick ink frame. */
export function Card({ className, children, ...rest }: Div) {
    const { look } = useTheme();
    const base =
        look === "bauhaus"
            ? "rounded-none border-2 border-neutral-200 bg-neutral-900 p-5 space-y-4"
            : "border border-neutral-800 p-4 space-y-4";
    return (
        <div className={cx(base, className)} {...rest}>
            {children}
        </div>
    );
}

/** Section heading. Terminal: "> UPPERCASE". Bauhaus: full-bleed filled color bar. */
export function CardTitle({ children }: { children: React.ReactNode }) {
    const { look } = useTheme();
    if (look === "bauhaus") {
        return (
            <h2 className="-mx-5 -mt-5 mb-1 flex items-center gap-2 bg-green-400 px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#fff]">
                <span className="h-2.5 w-2.5 bg-[#fff]" />
                {children}
            </h2>
        );
    }
    return (
        <h2 className="text-sm text-neutral-300 uppercase tracking-wide">
            {"> "}
            {children}
        </h2>
    );
}

/** Muted helper text under a title. */
export function Hint({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-neutral-500 leading-relaxed">{children}</p>;
}

/** The Bauhaus signature: red circle · yellow square · blue triangle. */
function ShapeTrio() {
    return (
        <div className="flex items-center gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 bg-yellow-400" />
            <span className="bh-tri text-green-400" />
        </div>
    );
}

/** Page header with title + optional right-side slot. */
export function PageHeader({ title, right }: { title: string; right?: React.ReactNode }) {
    const { look } = useTheme();
    if (look === "bauhaus") {
        return (
            <header className="border-b-4 border-neutral-200 pb-3">
                <div className="flex items-center justify-between">
                    <ShapeTrio />
                    {right && (
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{right}</span>
                    )}
                </div>
                <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-neutral-100">{title}</h1>
            </header>
        );
    }
    return (
        <header className="flex items-baseline justify-between border-b border-neutral-700 pb-2">
            <h1 className="text-green-400 text-lg font-bold tracking-wider uppercase">{title}</h1>
            {right && <span className="text-neutral-500 text-sm">{right}</span>}
        </header>
    );
}

/** Labeled field wrapper. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    const { look } = useTheme();
    const labelCls =
        look === "bauhaus"
            ? "block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2"
            : "block text-xs text-neutral-500 mb-1 uppercase tracking-wide";
    return (
        <div>
            <label className={labelCls}>{label}</label>
            {children}
        </div>
    );
}

export function TextInput({ className, ...rest }: Inp) {
    const { look } = useTheme();
    const base =
        look === "bauhaus"
            ? "w-full rounded-none border-2 border-neutral-200 bg-transparent px-3 py-2 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-green-400 text-sm transition-colors"
            : "w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400 text-sm";
    return <input className={cx(base, className)} {...rest} />;
}

type Variant = "primary" | "default" | "danger";

export function Button({
    variant = "default",
    className,
    children,
    ...rest
}: Btn & { variant?: Variant }) {
    const { look } = useTheme();

    if (look === "bauhaus") {
        // Filled color blocks framed in thick ink; literal #fff on filled variants.
        const styles: Record<Variant, string> = {
            primary: "bg-green-400 text-[#fff] border-2 border-neutral-200 hover:brightness-110",
            default: "bg-transparent text-neutral-200 border-2 border-neutral-200 hover:bg-neutral-800",
            danger: "bg-red-400 text-[#fff] border-2 border-neutral-200 hover:brightness-110",
        };
        return (
            <button
                className={cx(
                    "rounded-none px-4 py-2 text-xs font-bold uppercase tracking-wider transition disabled:opacity-40 disabled:pointer-events-none",
                    styles[variant],
                    className,
                )}
                {...rest}
            >
                {children}
            </button>
        );
    }

    const styles: Record<Variant, string> = {
        primary: "border border-green-400/60 text-green-400 hover:bg-green-400/10",
        default: "border border-neutral-600 text-neutral-300 hover:border-neutral-400",
        danger: "border border-red-500/50 text-red-400 hover:bg-red-500/10",
    };
    return (
        <button
            className={cx(
                "px-3 py-1.5 text-sm disabled:opacity-30 disabled:pointer-events-none whitespace-nowrap",
                styles[variant],
                className,
            )}
            {...rest}
        >
            {"[ "}
            {children}
            {" ]"}
        </button>
    );
}

/** A full-width toggle row (label left, on/off state right). */
export function ToggleRow({
    label,
    on,
    busy,
    onClick,
}: {
    label: string;
    on: boolean;
    busy?: boolean;
    onClick: () => void;
}) {
    const { look } = useTheme();

    if (look === "bauhaus") {
        return (
            <button
                onClick={onClick}
                disabled={busy}
                className="flex items-center justify-between w-full rounded-none border-2 border-neutral-200 px-3 py-2.5 text-sm disabled:opacity-40 transition"
            >
                <span className="font-medium text-neutral-200">{label}</span>
                <span className="flex items-center gap-2">
                    <span
                        className={cx(
                            "text-xs font-bold uppercase tracking-wider",
                            on ? "text-green-400" : "text-neutral-500",
                        )}
                    >
                        {busy ? "…" : on ? "On" : "Off"}
                    </span>
                    {/* square block switch with thick ink frame */}
                    <span
                        className={cx(
                            "relative inline-flex h-5 w-9 items-center border-2 border-neutral-200 transition-colors",
                            on ? "bg-green-400" : "bg-transparent",
                        )}
                    >
                        <span
                            className={cx(
                                "inline-block h-3 w-3 transition-transform",
                                on ? "translate-x-4 bg-[#fff]" : "translate-x-0.5 bg-neutral-400",
                            )}
                        />
                    </span>
                </span>
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            disabled={busy}
            className="flex items-center justify-between w-full border border-neutral-700 hover:border-neutral-500 px-3 py-2 text-sm disabled:opacity-40"
        >
            <span className="text-neutral-300">{label}</span>
            <span className={on ? "text-green-400" : "text-neutral-500"}>
                {busy ? "…" : on ? "[ ON ]" : "[ OFF ]"}
            </span>
        </button>
    );
}
