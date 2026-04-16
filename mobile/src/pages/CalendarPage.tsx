import { useState, useEffect } from "react";
import { calendar } from "../lib/db";
import type { CalendarEvent, EventColor } from "../lib/db";

const EVENT_COLORS: EventColor[] = ["green", "blue", "red", "yellow", "purple"];
const dotStyle: Record<EventColor, string> = {
    green:  "background:#4ade80",
    blue:   "background:#60a5fa",
    red:    "background:#f87171",
    yellow: "background:#fbbf24",
    purple: "background:#a78bfa",
};
const dotClass: Record<EventColor, string> = {
    green:  "bg-green-400",
    blue:   "bg-blue-400",
    red:    "bg-red-400",
    yellow: "bg-yellow-400",
    purple: "bg-purple-400",
};

function pad(n: number) { return String(n).padStart(2, "0"); }

function CalendarGrid({ year, month, events, onDayPress, selectedDay }: {
    year: number; month: number;
    events: CalendarEvent[];
    onDayPress: (dateStr: string) => void;
    selectedDay: string | null;
}) {
    const firstDay    = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today       = new Date();

    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const eventsByDay = events.reduce<Record<number, EventColor[]>>((acc, e) => {
        const d = new Date(e.startDate).getDate();
        (acc[d] ??= []).push(e.color);
        return acc;
    }, {});

    return (
        <div className="border-b border-[var(--color-border)]">
            {/* day labels */}
            <div className="grid grid-cols-7">
                {["S","M","T","W","T","F","S"].map((d, i) => (
                    <div key={i} className="text-center py-1.5 label text-[9px]">{d}</div>
                ))}
            </div>
            {/* cells */}
            <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                    if (!day) return <div key={i} className="h-11" />;
                    const isToday    = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
                    const dateStr    = `${year}-${pad(month)}-${pad(day)}`;
                    const isSelected = dateStr === selectedDay;
                    const evColors   = eventsByDay[day] ?? [];

                    return (
                        <button key={i} onClick={() => onDayPress(dateStr)}
                            className="h-11 flex flex-col items-center justify-center gap-0.5 transition-colors active:opacity-60"
                            style={{ background: isSelected ? "var(--color-accent-dim)" : undefined }}>
                            <span
                                className={`text-sm ${isToday ? "font-bold" : ""}`}
                                style={{ color: isToday ? "var(--color-accent)" : isSelected ? "var(--color-accent)" : undefined }}
                            >
                                {day}
                            </span>
                            {evColors.length > 0 && (
                                <div className="flex gap-0.5">
                                    {evColors.slice(0, 3).map((c, ci) => (
                                        <div key={ci} className={`w-1 h-1 rounded-full ${dotClass[c]}`} />
                                    ))}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function CalendarPage() {
    const today = new Date();
    const [year,     setYear]     = useState(today.getFullYear());
    const [month,    setMonth]    = useState(today.getMonth() + 1);
    const [events,   setEvents]   = useState<CalendarEvent[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [showAdd,  setShowAdd]  = useState(false);

    // Add form
    const [title,    setTitle]    = useState("");
    const [startDate, setStart]   = useState("");
    const [endDate,   setEnd]     = useState("");
    const [desc,      setDesc]    = useState("");
    const [color,     setColor]   = useState<EventColor>("green");
    const [isAllDay,  setAllDay]  = useState(true);

    const monthKey = `${year}-${pad(month)}`;

    function refresh() { setEvents(calendar.list(monthKey)); }
    useEffect(refresh, [monthKey]);

    function prevMonth() {
        if (month === 1) { setYear(y => y - 1); setMonth(12); }
        else setMonth(m => m - 1);
        setSelected(null);
    }
    function nextMonth() {
        if (month === 12) { setYear(y => y + 1); setMonth(1); }
        else setMonth(m => m + 1);
        setSelected(null);
    }

    function handleDayPress(dateStr: string) {
        setSelected(dateStr === selected ? null : dateStr);
        setStart(dateStr);
        setShowAdd(false);
    }

    function handleAdd() {
        if (!title.trim() || !startDate) return;
        calendar.add({ title: title.trim(), startDate, endDate: endDate || undefined, description: desc || undefined, color, isAllDay });
        setTitle(""); setDesc(""); setEnd(""); setColor("green"); setAllDay(true);
        setShowAdd(false);
        refresh();
    }

    const selectedEvents = selected ? events.filter((e) => e.startDate.startsWith(selected)) : [];

    return (
        <div>
            {/* header */}
            <div className="page-header">
                <button onClick={prevMonth} className="text-[var(--color-muted)] text-xl px-2 active:text-white">‹</button>
                <span className="page-title">
                    {new Date(year, month - 1).toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
                </span>
                <button onClick={nextMonth} className="text-[var(--color-muted)] text-xl px-2 active:text-white">›</button>
            </div>

            <CalendarGrid year={year} month={month} events={events} onDayPress={handleDayPress} selectedDay={selected} />

            {/* selected day panel */}
            {selected && (
                <div>
                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                        <span className="label">
                            {new Date(selected + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
                        </span>
                        <button onClick={() => setShowAdd(true)} className="text-[10px] tracking-widest" style={{ color: "var(--color-accent)" }}>
                            + ADD
                        </button>
                    </div>

                    {selectedEvents.length === 0 ? (
                        <div className="px-4 py-3 text-[10px] text-[var(--color-muted)]">No events on this day.</div>
                    ) : (
                        selectedEvents.map((e) => (
                            <div key={e.id} className="list-row">
                                <div className={`w-2.5 h-2.5 shrink-0 rounded-full ${dotClass[e.color]}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm">{e.title}</div>
                                    {e.description && <div className="label mt-0.5 normal-case">{e.description}</div>}
                                </div>
                                <button onClick={() => { calendar.remove(e.id); refresh(); }}
                                    className="text-[var(--color-border)] text-lg px-1 active:text-red-400">×</button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add form */}
            {showAdd && (
                <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex flex-col gap-2">
                    <input value={title} onChange={(e) => setTitle(e.target.value)}
                        placeholder="Event title..."
                        className="input-field" />
                    <div className="flex gap-2">
                        <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} className="input-field flex-1" />
                        <input type="date" value={endDate}   onChange={(e) => setEnd(e.target.value)}   className="input-field flex-1" />
                    </div>
                    <input value={desc} onChange={(e) => setDesc(e.target.value)}
                        placeholder="Description (optional)"
                        className="input-field" />
                    <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                            {EVENT_COLORS.map((c) => (
                                <button key={c} onClick={() => setColor(c)}
                                    className={`w-7 h-7 rounded-full transition-all ${dotClass[c]} ${color === c ? "ring-2 ring-white ring-offset-1 ring-offset-[var(--color-surface)]" : "opacity-50"}`} />
                            ))}
                        </div>
                        <label className="ml-auto flex items-center gap-1.5 text-[10px] text-[var(--color-muted)] cursor-pointer">
                            <input type="checkbox" checked={isAllDay} onChange={(e) => setAllDay(e.target.checked)} className="accent-[var(--color-accent)]" />
                            ALL DAY
                        </label>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAdd}            className="btn-primary flex-1">SAVE</button>
                        <button onClick={() => setShowAdd(false)} className="btn-ghost flex-1">CANCEL</button>
                    </div>
                </div>
            )}

            {/* All events list when no day selected */}
            {!selected && events.length > 0 && (
                <div>
                    <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                        <span className="label">THIS MONTH ({events.length})</span>
                    </div>
                    {events.map((e) => (
                        <div key={e.id} className="list-row">
                            <div className={`w-2.5 h-2.5 shrink-0 rounded-full ${dotClass[e.color]}`} />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm truncate">{e.title}</div>
                                <div className="label mt-0.5">
                                    {new Date(e.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </div>
                            </div>
                            <button onClick={() => { calendar.remove(e.id); refresh(); }}
                                className="text-[var(--color-border)] text-lg px-1 active:text-red-400">×</button>
                        </div>
                    ))}
                </div>
            )}

            {!selected && events.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">📅</div>
                    <div className="empty-state-title">NO EVENTS</div>
                    <div className="empty-state-hint">Tap a day to add an event</div>
                </div>
            )}
        </div>
    );
}
