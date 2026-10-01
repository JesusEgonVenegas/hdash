import { useState } from "react";

const STEPS = [
    {
        icon: "⌂",
        title: "HOUSEHOLD DASHBOARD",
        body: "Everything your household needs in one offline-first app. No account, no cloud, no subscription.",
    },
    {
        icon: "✓",
        title: "TRACK EVERYTHING",
        body: "Todos with priority, recurring chores, grocery lists with running totals, calendar events, debts — all in one place.",
    },
    {
        icon: "💰",
        title: "BUDGET & NOTES",
        body: "Set monthly spending limits by category and keep notes. Progress bars show where you stand at a glance.",
    },
    {
        icon: "📦",
        title: "YOUR DATA, YOUR DEVICE",
        body: "Everything is stored locally. Export a JSON backup anytime and import it on any device — like a KeePass vault for your household.",
    },
];

interface Props {
    onDone: () => void;
}

export function Onboarding({ onDone }: Props) {
    const [step, setStep] = useState(0);
    const isLast = step === STEPS.length - 1;
    const s = STEPS[step];

    return (
        <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col">
            {/* top spacer */}
            <div className="safe-top bg-[#0a0a0a]" />

            {/* progress dots */}
            <div className="flex justify-center gap-2 pt-6 pb-2">
                {STEPS.map((_, i) => (
                    <div
                        key={i}
                        className="h-px w-8 transition-colors"
                        style={{ background: i === step ? "var(--color-accent)" : "var(--color-border)" }}
                    />
                ))}
            </div>

            {/* content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                <div
                    className="text-5xl mb-8 opacity-90"
                    style={{ filter: "drop-shadow(0 0 12px var(--color-accent))" }}
                >
                    {s.icon}
                </div>

                <h1 className="text-sm font-bold tracking-widest mb-4" style={{ color: "var(--color-accent)" }}>
                    {s.title}
                </h1>

                <p className="text-sm text-neutral-400 leading-relaxed max-w-xs">
                    {s.body}
                </p>
            </div>

            {/* navigation */}
            <div className="px-6 pb-4 flex flex-col gap-3">
                <button
                    onClick={() => isLast ? onDone() : setStep(s => s + 1)}
                    className="btn-primary w-full py-3 text-sm tracking-widest"
                >
                    {isLast ? "GET STARTED" : "NEXT →"}
                </button>

                {!isLast && (
                    <button
                        onClick={onDone}
                        className="text-[10px] tracking-widest text-[var(--color-muted)] py-2"
                    >
                        SKIP
                    </button>
                )}
            </div>

            <div className="safe-bottom bg-[#0a0a0a]" />
        </div>
    );
}
