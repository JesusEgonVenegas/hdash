import { useState, useEffect } from "react";
import { calendar } from "../lib/db";
import type { CalendarEvent, EventColor } from "../lib/db";

const COLORS: EventColor[] = ["green", "blue", "red", "yellow", "purple"];
const colorDot: Record<EventColor, string> = {
    green: "bg-green-400",
    blue: "bg-blue-400",
    red: "bg-red-400",
    yellow: "bg-yellow-400",
    purple: "bg-purple-400",
};

function pad(n: number) { return String(n).padStart(2, "0"); }

function CalendarGrid({
    year, month, events, onDayPress
}: {
    year: number; month: number;
    events: CalendarEvent[];
    onDayPress: (dateStr: string) => void;
}) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();

    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    const eventDays = new Set(
        events.map((e) => new Date(e.startDate).getDate())
    );

    return (
        <div>
            <div className="grid grid-cols-7 border-b border-neutral-800">
                {["S","M","T","W","T","F","S"].map((d, i) => (
                    <div key={i} className="text-center py-1 text-[10px] text-neutral-600">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                    if (!day) return <div key={i} className="h-10" />;
                    const isToday = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
                    const hasEvent = eventDays.has(day);
                    const dateStr = `${year}-${pad(month)}-${pad(day)}`;
                    return (
                        <button key={i} onClick={() => onDayPress(dateStr)}
                            className={`h-10 flex flex-col items-center justify-center gap-0.5 text-sm ${isToday ? "text-green-400 font-bold" : "text-neutral-300"} active:bg-neutral-900`}>
                            {day}
                            {hasEvent && <div className="w-1 h-1 rounded-full bg-green-400" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function CalendarPage() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);

    // Add form state
    const [title, setTitle] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [desc, setDesc] = useState("");
    const [color, setColor] = useState<EventColor>("green");
    const [isAllDay, setIsAllDay] = useState(true);

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
        setStartDate(dateStr);
        setShowAdd(false);
    }

    function handleAdd() {
        if (!title.trim() || !startDate) return;
        calendar.add({ title: title.trim(), startDate, endDate: endDate || undefined, description: desc || undefined, color, isAllDay });
        setTitle(""); setDesc(""); setEndDate(""); setColor("green"); setIsAllDay(true);
        setShowAdd(false);
        refresh();
    }

    const selectedEvents = selected
        ? events.filter((e) => e.startDate.startsWith(selected))
        : [];

    return (
        <div>
            <div className="px-4 pt-4 pb-2 border-b border-neutral-800 flex items-center gap-2">
                <button onClick={prevMonth} className="text-neutral-400 px-2 text-lg active:text-green-400">‹</button>
                <span className="text-green-400 font-bold tracking-widest text-sm flex-1 text-center">
                    {new Date(year, month - 1).toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
                </span>
                <button onClick={nextMonth} className="text-neutral-400 px-2 text-lg active:text-green-400">›</button>
            </div>

            <CalendarGrid year={year} month={month} events={events} onDayPress={handleDayPress} />

            {/* Selected day events */}
            {selected && (
                <div className="border-t border-neutral-800 mt-1">
                    <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500 tracking-widest">
                            {new Date(selected + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
                        </span>
                        <button onClick={() => setShowAdd(true)} className="text-[10px] text-green-400 tracking-wider">+ ADD</button>
                    </div>
                    {selectedEvents.length === 0 ? (
                        <div className="px-4 pb-3 text-neutral-600 text-xs">No events.</div>
                    ) : (
                        selectedEvents.map((e) => (
                            <div key={e.id} className="flex items-center gap-3 px-4 py-2 border-t border-neutral-800">
                                <div className={`w-2 h-2 shrink-0 rounded-full ${colorDot[e.color]}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-neutral-200">{e.title}</div>
                                    {e.description && <div className="text-[10px] text-neutral-600">{e.description}</div>}
                                </div>
                                <button onClick={() => { calendar.remove(e.id); refresh(); }} className="text-neutral-700 active:text-red-400 px-1">×</button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add event form */}
            {showAdd && (
                <div className="border-t border-neutral-800 bg-[#111] p-3 flex flex-col gap-2">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title..."
                        className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 w-full" />
                    <div className="flex gap-2">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                            className="bg-[#0a0a0a] border border-neutral-700 px-2 py-2 text-sm text-neutral-200 flex-1 [color-scheme:dark]" />
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                            className="bg-[#0a0a0a] border border-neutral-700 px-2 py-2 text-sm text-neutral-200 flex-1 [color-scheme:dark]" />
                    </div>
                    <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)"
                        className="bg-[#0a0a0a] border border-neutral-700 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 w-full" />
                    <div className="flex gap-2">
                        {COLORS.map((c) => (
                            <button key={c} onClick={() => setColor(c)}
                                className={`w-7 h-7 rounded-full ${colorDot[c]} ${color === c ? "ring-2 ring-white ring-offset-1 ring-offset-[#111]" : "opacity-60"}`} />
                        ))}
                        <label className="ml-auto flex items-center gap-1 text-[10px] text-neutral-500">
                            <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} className="accent-green-400" />
                            ALL DAY
                        </label>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAdd} className="flex-1 py-2 bg-green-400 text-black text-xs font-bold tracking-wider">SAVE</button>
                        <button onClick={() => setShowAdd(false)} className="flex-1 py-2 border border-neutral-700 text-neutral-400 text-xs tracking-wider">CANCEL</button>
                    </div>
                </div>
            )}

            {/* All events list when nothing selected */}
            {!selected && events.length > 0 && (
                <div className="border-t border-neutral-800 mt-1">
                    <div className="px-4 py-2 text-[10px] text-neutral-500 tracking-widest">THIS MONTH</div>
                    {events.map((e) => (
                        <div key={e.id} className="flex items-center gap-3 px-4 py-2 border-t border-neutral-800">
                            <div className={`w-2 h-2 shrink-0 rounded-full ${colorDot[e.color]}`} />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-neutral-200 truncate">{e.title}</div>
                                <div className="text-[10px] text-neutral-600">
                                    {new Date(e.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </div>
                            </div>
                            <button onClick={() => { calendar.remove(e.id); refresh(); }} className="text-neutral-700 active:text-red-400 px-1">×</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
