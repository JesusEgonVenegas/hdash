"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Shown at "/" to logged-out visitors; members get the dashboard instead.

const FEATURES = [
    { label: "today",         desc: "everything that needs you now — overdue chores, todos, events, payments" },
    { label: "chores",        desc: "auto-rotation to whoever's next, streaks, and undo for mis-taps" },
    { label: "fairness",      desc: "who's paying and who's doing the work, in one plain-English verdict" },
    { label: "money",         desc: "shared expenses, settle-up, income-based splits, debts with real interest" },
    { label: "grocery",       desc: "shared list grouped by aisle, quick-add staples, fed by the meal plan" },
    { label: "calendar",      desc: "month view with recurring events, plus todos and a shared pinboard" },
    { label: "digest",        desc: "a morning email of the household's day, in four skins" },
    { label: "themes",        desc: "terminal green, Gruvbox, Solarized, Dracula, Nord, Bauhaus" },
];

export default function LandingPage() {
    const [tick, setTick] = useState(true);

    useEffect(() => {
        const id = setInterval(() => setTick((t) => !t), 600);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="space-y-16 py-4">
            {/* HERO */}
            <section className="space-y-6">
                <div className="border border-neutral-700 p-6 sm:p-10">
                    <div className="text-green-400 text-xs mb-4 tracking-widest">HDASH</div>
                    <h1 className="text-2xl sm:text-4xl text-white font-bold leading-tight mb-4">
                        <span className="text-green-400">&gt; </span>
                        household management<br />
                        <span className="text-neutral-400">for people who hate</span><br />
                        bloated apps
                        <span className={`text-green-400 ml-1 ${tick ? "opacity-100" : "opacity-0"}`}>_</span>
                    </h1>
                    <p className="text-neutral-400 text-sm sm:text-base max-w-xl leading-relaxed">
                        One dashboard for everyone you live with: chores that rotate themselves,
                        a shared grocery list, the calendar, the money, and a straight answer to
                        &ldquo;are we even?&rdquo; Self-hosted, in a terminal UI that stays out of your way.
                    </p>
                    <div className="flex flex-wrap gap-3 mt-8">
                        <Link
                            href="/register"
                            className="border border-green-400 px-6 py-2.5 text-green-400 hover:bg-green-400/10 transition-colors text-sm"
                        >
                            [ get started ]
                        </Link>
                        <Link
                            href="/login"
                            className="border border-neutral-700 px-6 py-2.5 text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors text-sm"
                        >
                            sign in
                        </Link>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="space-y-3">
                <div className="text-xs text-neutral-500 tracking-widest mb-4">FEATURES</div>
                <div className="border border-neutral-700 divide-y divide-neutral-800">
                    {FEATURES.map((f) => (
                        <div key={f.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 px-5 py-3">
                            <span className="text-green-400 text-sm w-32 flex-shrink-0">
                                &gt; {f.label}
                            </span>
                            <span className="text-neutral-400 text-sm">{f.desc}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="space-y-3">
                <div className="text-xs text-neutral-500 tracking-widest mb-4">HOW IT WORKS</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { step: "01", title: "create an account", body: "Register with an email and password. Takes 10 seconds." },
                        { step: "02", title: "create a household", body: "Name your household and share the invite code with housemates." },
                        { step: "03", title: "run your house", body: "Add groceries, assign chores, track shared todos and events." },
                    ].map((s) => (
                        <div key={s.step} className="border border-neutral-700 p-5">
                            <div className="text-green-400/40 text-2xl font-bold mb-2">{s.step}</div>
                            <div className="text-white text-sm font-bold mb-1">{s.title}</div>
                            <div className="text-neutral-500 text-xs leading-relaxed">{s.body}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SELF-HOSTABLE CALLOUT */}
            <section>
                <div className="border border-neutral-700 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="text-neutral-300 text-sm font-bold mb-1">self-hostable with Docker</div>
                        <div className="text-neutral-500 text-xs">
                            Your data stays on your server. One{" "}
                            <code className="text-green-400">docker compose up</code> and you&apos;re running.
                        </div>
                    </div>
                    <a
                        href="https://github.com/JesusEgonVenegas/hdash"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-neutral-700 px-5 py-2 text-xs text-neutral-400 hover:border-neutral-500 hover:text-white transition-colors whitespace-nowrap"
                    >
                        view on github →
                    </a>
                </div>
            </section>

            {/* FOOTER CTA */}
            <section className="border-t border-neutral-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-neutral-600 text-xs">HDASH — open source household dashboard</span>
                <div className="flex gap-3">
                    <Link href="/register" className="text-green-400 text-sm hover:underline">
                        get started →
                    </Link>
                </div>
            </section>
        </div>
    );
}
