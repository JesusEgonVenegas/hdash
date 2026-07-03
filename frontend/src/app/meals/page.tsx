"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { Meal } from "@/types/meal";
import FoodTabs from "../grocery/components/FoodTabs";

const SLOTS: Meal["slot"][] = ["breakfast", "lunch", "dinner"];

function startOfWeek(d: Date) {
    const x = new Date(d);
    const dow = (x.getDay() + 6) % 7; // Monday = 0
    x.setDate(x.getDate() - dow);
    x.setHours(0, 0, 0, 0);
    return x;
}
function ymd(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MealsPage() {
    const { token, isLoading } = useAuth();
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [meals, setMeals] = useState<Meal[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [flash, setFlash] = useState<string | null>(null);

    const [date, setDate] = useState(ymd(new Date()));
    const [slot, setSlot] = useState<Meal["slot"]>("dinner");
    const [title, setTitle] = useState("");
    const [ingredients, setIngredients] = useState("");
    const [posting, setPosting] = useState(false);

    const days = useMemo(
        () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000)),
        [weekStart]
    );

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setMeals(await apiFetch<Meal[]>(`/api/meals?week=${ymd(weekStart)}`, { token }));
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load meals");
        }
    }, [token, weekStart]);

    useEffect(() => {
        if (isLoading || !token) return;
        load();
    }, [token, isLoading, load]);

    function flashMsg(m: string) {
        setError(null);
        setFlash(m);
        setTimeout(() => setFlash(null), 3500);
    }

    async function add(e: FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        setPosting(true);
        try {
            await apiFetch("/api/meals", {
                method: "POST",
                body: { date: new Date(date).toISOString(), slot, title: title.trim(), ingredients: ingredients.trim() || null },
                token,
            });
            setTitle("");
            setIngredients("");
            await load();
        } catch {
            setError("Could not add that meal.");
        } finally {
            setPosting(false);
        }
    }

    async function remove(id: string) {
        await apiFetch(`/api/meals/${id}`, { method: "DELETE", token });
        setMeals((prev) => prev.filter((m) => m.id !== id));
    }

    async function toGrocery(id: string) {
        try {
            const r = await apiFetch<{ message: string }>(`/api/meals/${id}/to-grocery`, { method: "POST", token });
            flashMsg(r.message);
        } catch {
            setError("Nothing to add — this meal has no ingredients.");
        }
    }

    if (isLoading) return <p className="text-neutral-500 font-mono">loading...</p>;

    const rangeLabel = `${days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    const todayKey = ymd(new Date());

    return (
        <section className="space-y-6 font-mono">
            <FoodTabs />

            <div className="border border-neutral-700 p-4 flex items-center justify-between">
                <h1 className="text-lg text-green-400">{"> "}MEAL PLAN</h1>
                <div className="flex items-center gap-3 text-sm">
                    <button onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))} className="text-neutral-500 hover:text-green-400">← prev</button>
                    <span className="text-neutral-400">{rangeLabel}</span>
                    <button onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))} className="text-neutral-500 hover:text-green-400">next →</button>
                </div>
            </div>

            {error && <div className="text-red-400 text-sm border border-red-500/40 px-3 py-2">[ERROR] {error}</div>}
            {flash && <div className="text-green-400 text-sm border border-green-500/30 px-3 py-2">{flash}</div>}

            {/* ADD MEAL */}
            <form onSubmit={add} className="border border-neutral-800 p-4 space-y-3">
                <div className="flex flex-wrap gap-3">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                        className="bg-transparent border border-neutral-700 px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400" />
                    <select value={slot} onChange={(e) => setSlot(e.target.value as Meal["slot"])}
                        className="bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-2 text-sm focus:outline-none focus:border-green-400">
                        {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="meal name"
                        className="flex-1 min-w-[140px] bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 text-sm focus:outline-none focus:border-green-400" />
                </div>
                <textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} rows={2}
                    placeholder="ingredients, one per line (optional) — push these to grocery later"
                    className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 text-sm resize-none focus:outline-none focus:border-green-400" />
                <button type="submit" disabled={posting || !title.trim()}
                    className="border border-green-400 px-4 py-1.5 text-green-400 hover:bg-green-400/10 disabled:opacity-40 text-sm">
                    {posting ? "…" : "[ ADD MEAL ]"}
                </button>
            </form>

            {/* WEEK */}
            <div className="space-y-2">
                {days.map((d) => {
                    const key = ymd(d);
                    const dayMeals = meals.filter((m) => m.date.slice(0, 10) === key)
                        .sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
                    return (
                        <div key={key} className={`border p-3 ${key === todayKey ? "border-green-500/40" : "border-neutral-800"}`}>
                            <div className="flex items-baseline justify-between mb-2">
                                <span className={`text-sm ${key === todayKey ? "text-green-400" : "text-neutral-300"}`}>
                                    {d.toLocaleDateString(undefined, { weekday: "long" })}
                                    <span className="text-neutral-600 text-xs ml-2">{d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                </span>
                                {key === todayKey && <span className="text-green-400 text-[10px] uppercase">today</span>}
                            </div>
                            {dayMeals.length === 0 ? (
                                <p className="text-neutral-600 text-xs">nothing planned</p>
                            ) : (
                                <ul className="space-y-2">
                                    {dayMeals.map((m) => (
                                        <li key={m.id} className="border-l-2 border-neutral-700 pl-3 group">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">
                                                    <span className="text-neutral-500 text-xs uppercase mr-2">{m.slot}</span>
                                                    <span className="text-white">{m.title}</span>
                                                </span>
                                                <span className="flex items-center gap-3 text-xs">
                                                    {m.ingredients && (
                                                        <button onClick={() => toGrocery(m.id)} className="text-neutral-500 hover:text-green-400" title="add ingredients to grocery">→ grocery</button>
                                                    )}
                                                    <button onClick={() => remove(m.id)} className="text-neutral-700 hover:text-red-400 opacity-0 group-hover:opacity-100">×</button>
                                                </span>
                                            </div>
                                            {m.ingredients && (
                                                <p className="text-neutral-600 text-xs mt-0.5">{m.ingredients.split("\n").filter(Boolean).join(" · ")}</p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
