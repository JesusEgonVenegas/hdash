"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { CalendarEvent } from "@/types/calendar";

const COLOR_MAP: Record<string, string> = {
    green: "bg-green-400/20 border-green-400/40 text-green-300",
    blue: "bg-blue-400/20 border-blue-400/40 text-blue-300",
    red: "bg-red-400/20 border-red-400/40 text-red-300",
    yellow: "bg-yellow-400/20 border-yellow-400/40 text-yellow-300",
    purple: "bg-purple-400/20 border-purple-400/40 text-purple-300",
};

const COLOR_DOT: Record<string, string> = {
    green: "bg-green-400",
    blue: "bg-blue-400",
    red: "bg-red-400",
    yellow: "bg-yellow-400",
    purple: "bg-purple-400",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

export default function CalendarPage() {
    const { token, user, isLoading } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Current month view
    const [viewDate, setViewDate] = useState(() => new Date());

    // Add form
    const [showForm, setShowForm] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newStartDate, setNewStartDate] = useState("");
    const [newEndDate, setNewEndDate] = useState("");
    const [newIsAllDay, setNewIsAllDay] = useState(false);
    const [newColor, setNewColor] = useState("green");
    const [adding, setAdding] = useState(false);

    // Detail view
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isEditingEvent, setIsEditingEvent] = useState(false);

    // Edit form state
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editStartDate, setEditStartDate] = useState("");
    const [editEndDate, setEditEndDate] = useState("");
    const [editIsAllDay, setEditIsAllDay] = useState(false);
    const [editColor, setEditColor] = useState("green");
    const [saving, setSaving] = useState(false);

    const monthKey = getMonthKey(viewDate);

    const loadEvents = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiFetch<CalendarEvent[]>(
                `/api/calendar?month=${monthKey}`,
                { token }
            );
            setEvents(data);
            setError(null);
        } catch (err: any) {
            setError(err.message ?? "Failed to load events");
        } finally {
            setLoading(false);
        }
    }, [token, monthKey]);

    useEffect(() => {
        if (isLoading || !token) return;
        setLoading(true);
        loadEvents();
    }, [token, isLoading, loadEvents]);

    function prevMonth() {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }

    function nextMonth() {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }

    function goToday() {
        setViewDate(new Date());
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!newTitle.trim() || !newStartDate) return;
        setAdding(true);
        setError(null);

        try {
            const body: any = {
                title: newTitle.trim(),
                startDate: new Date(newStartDate).toISOString(),
                isAllDay: newIsAllDay,
                color: newColor,
            };
            if (newDescription.trim()) body.description = newDescription.trim();
            if (newEndDate) body.endDate = new Date(newEndDate).toISOString();

            const created = await apiFetch<CalendarEvent>("/api/calendar", {
                method: "POST",
                body,
                token,
            });
            setEvents(prev => [...prev, created]);
            setNewTitle("");
            setNewDescription("");
            setNewStartDate("");
            setNewEndDate("");
            setNewIsAllDay(false);
            setNewColor("green");
            setShowForm(false);
        } catch (err: any) {
            setError(err.data?.error ?? err.message ?? "Failed to add event");
        } finally {
            setAdding(false);
        }
    }

    function openEdit(evt: CalendarEvent) {
        setEditTitle(evt.title);
        setEditDescription(evt.description ?? "");
        setEditStartDate(new Date(evt.startDate).toISOString().split("T")[0]);
        setEditEndDate(evt.endDate ? new Date(evt.endDate).toISOString().split("T")[0] : "");
        setEditIsAllDay(evt.isAllDay);
        setEditColor(evt.color);
        setIsEditingEvent(true);
    }

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedEvent || !editTitle.trim() || !editStartDate) return;
        setSaving(true);
        setError(null);
        try {
            const body: any = {
                title: editTitle.trim(),
                startDate: new Date(editStartDate).toISOString(),
                isAllDay: editIsAllDay,
                color: editColor,
            };
            if (editDescription.trim()) body.description = editDescription.trim();
            if (editEndDate) body.endDate = new Date(editEndDate).toISOString();

            const updated = await apiFetch<CalendarEvent>(`/api/calendar/${selectedEvent.id}`, {
                method: "PUT",
                body,
                token,
            });
            setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
            setSelectedEvent(updated);
            setIsEditingEvent(false);
        } catch (err: any) {
            setError(err.data?.error ?? err.message ?? "Failed to update event");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this event?")) return;
        try {
            await apiFetch(`/api/calendar/${id}`, {
                method: "DELETE",
                token,
            });
            setEvents(prev => prev.filter(e => e.id !== id));
            setSelectedEvent(null);
            setIsEditingEvent(false);
        } catch (err: any) {
            setError(err.message ?? "Failed to delete event");
        }
    }

    // Build calendar grid
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();
    const today = new Date();

    // Build 6 weeks of days
    const cells: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    function getEventsForDay(day: number): CalendarEvent[] {
        const date = new Date(year, month, day);
        return events.filter(evt => {
            const start = new Date(evt.startDate);
            if (evt.endDate) {
                const end = new Date(evt.endDate);
                return date >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
                    date <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
            }
            return isSameDay(start, date);
        });
    }

    if (isLoading) {
        return (
            <section className="space-y-6">
                <div className="border border-neutral-700 p-4">
                    <h1 className="text-lg text-green-400">{"> "}CALENDAR</h1>
                </div>
                <p className="text-neutral-500 text-sm">loading...</p>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            {/* HEADER */}
            <div className="border border-neutral-700 p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg text-green-400">{"> "}CALENDAR</h1>
                        <p className="text-neutral-500 text-xs mt-1">
                            {MONTHS[month]} {year} · {events.length} event{events.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={prevMonth}
                            className="ascii-button text-sm"
                        >
                            &larr;
                        </button>
                        <button
                            onClick={goToday}
                            className="ascii-button text-sm"
                        >
                            today
                        </button>
                        <button
                            onClick={nextMonth}
                            className="ascii-button text-sm"
                        >
                            &rarr;
                        </button>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="border border-green-400 py-1 px-3 text-green-400 hover:bg-green-400/10 cursor-pointer text-sm"
                        >
                            {showForm ? "cancel" : "[ + EVENT ]"}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="ascii-error">
                    [ERROR] {error}
                </div>
            )}

            {/* ADD FORM */}
            {showForm && (
                <div className="border border-neutral-700 p-6">
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="block text-sm text-neutral-400 mb-1">TITLE:</label>
                            <input
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                placeholder="birthday, appointment, deadline..."
                                className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-neutral-400 mb-1">DESCRIPTION (OPTIONAL):</label>
                            <input
                                value={newDescription}
                                onChange={e => setNewDescription(e.target.value)}
                                placeholder="any extra details..."
                                className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">START DATE:</label>
                                <input
                                    type="date"
                                    value={newStartDate}
                                    onChange={e => setNewStartDate(e.target.value)}
                                    required
                                    className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">END DATE (OPTIONAL):</label>
                                <input
                                    type="date"
                                    value={newEndDate}
                                    onChange={e => setNewEndDate(e.target.value)}
                                    className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-neutral-400">ALL DAY:</label>
                                <button
                                    type="button"
                                    onClick={() => setNewIsAllDay(!newIsAllDay)}
                                    className={`w-5 h-5 border flex items-center justify-center text-xs cursor-pointer ${
                                        newIsAllDay
                                            ? "border-green-400 text-green-400"
                                            : "border-neutral-600"
                                    }`}
                                >
                                    {newIsAllDay ? "✓" : ""}
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">COLOR:</label>
                                <div className="flex gap-2">
                                    {Object.keys(COLOR_DOT).map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setNewColor(c)}
                                            className={`w-6 h-6 rounded-full ${COLOR_DOT[c]} cursor-pointer ${
                                                newColor === c
                                                    ? "ring-2 ring-white ring-offset-1 ring-offset-black"
                                                    : "opacity-50 hover:opacity-100"
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={adding || !newTitle.trim() || !newStartDate}
                            className="border border-green-400 py-2 px-6 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                        >
                            {adding ? "Adding..." : "[ ADD EVENT ]"}
                        </button>
                    </form>
                </div>
            )}

            {/* CALENDAR GRID */}
            <div className="border border-neutral-700 overflow-x-auto">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-neutral-700">
                    {DAYS.map(day => (
                        <div key={day} className="text-center text-xs text-neutral-500 py-2 border-r border-neutral-800 last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                    {cells.map((day, i) => {
                        const dayEvents = day ? getEventsForDay(day) : [];
                        const isToday = day !== null && isSameDay(new Date(year, month, day), today);

                        return (
                            <div
                                key={i}
                                className={`min-h-[60px] sm:min-h-[80px] border-b border-r border-neutral-800 p-1 ${
                                    day === null ? "bg-neutral-900/30" : ""
                                }`}
                            >
                                {day !== null && (
                                    <>
                                        <div className={`text-xs mb-1 ${
                                            isToday
                                                ? "text-green-400 font-bold"
                                                : "text-neutral-500"
                                        }`}>
                                            {day}
                                        </div>
                                        <div className="space-y-0.5">
                                            {dayEvents.slice(0, 3).map(evt => (
                                                <button
                                                    key={evt.id}
                                                    onClick={() => setSelectedEvent(evt)}
                                                    className={`block w-full text-left text-[10px] px-1 py-0.5 border truncate cursor-pointer ${
                                                        COLOR_MAP[evt.color] || COLOR_MAP.green
                                                    }`}
                                                >
                                                    {evt.title}
                                                </button>
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <div className="text-[10px] text-neutral-500 px-1">
                                                    +{dayEvents.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* EVENT DETAIL PANEL */}
            {selectedEvent && (
                <div className="border border-neutral-700 p-4">
                    {isEditingEvent ? (
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="text-xs text-green-400 mb-2">{"> "}EDIT EVENT</div>
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1">TITLE:</label>
                                <input
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1">DESCRIPTION:</label>
                                <input
                                    value={editDescription}
                                    onChange={e => setEditDescription(e.target.value)}
                                    placeholder="optional"
                                    className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-neutral-400 mb-1">START DATE:</label>
                                    <input
                                        type="date"
                                        value={editStartDate}
                                        onChange={e => setEditStartDate(e.target.value)}
                                        required
                                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-400 mb-1">END DATE:</label>
                                    <input
                                        type="date"
                                        value={editEndDate}
                                        onChange={e => setEditEndDate(e.target.value)}
                                        className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <label className="text-xs text-neutral-400">ALL DAY:</label>
                                    <button
                                        type="button"
                                        onClick={() => setEditIsAllDay(!editIsAllDay)}
                                        className={`w-5 h-5 border flex items-center justify-center text-xs cursor-pointer ${
                                            editIsAllDay ? "border-green-400 text-green-400" : "border-neutral-600"
                                        }`}
                                    >
                                        {editIsAllDay ? "✓" : ""}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-neutral-400">COLOR:</label>
                                    <div className="flex gap-1.5">
                                        {Object.keys(COLOR_DOT).map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setEditColor(c)}
                                                className={`w-5 h-5 rounded-full ${COLOR_DOT[c]} cursor-pointer ${
                                                    editColor === c
                                                        ? "ring-2 ring-white ring-offset-1 ring-offset-black"
                                                        : "opacity-50 hover:opacity-100"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={saving || !editTitle.trim() || !editStartDate}
                                    className="border border-green-400 px-4 py-1 text-xs text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                                >
                                    {saving ? "saving..." : "[ save ]"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingEvent(false)}
                                    className="border border-neutral-700 px-4 py-1 text-xs text-neutral-400 hover:border-neutral-500 cursor-pointer"
                                >
                                    cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-3 h-3 rounded-full ${COLOR_DOT[selectedEvent.color] || COLOR_DOT.green}`} />
                                    <h3 className="text-white text-sm font-bold">{selectedEvent.title}</h3>
                                </div>
                                {selectedEvent.description && (
                                    <p className="text-neutral-400 text-xs mb-2">{selectedEvent.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-neutral-500">
                                    <span>
                                        {selectedEvent.isAllDay ? "all day · " : ""}
                                        {new Date(selectedEvent.startDate).toLocaleDateString()}
                                        {selectedEvent.endDate && (
                                            <> — {new Date(selectedEvent.endDate).toLocaleDateString()}</>
                                        )}
                                    </span>
                                    {selectedEvent.createdByName && (
                                        <span className="text-blue-400">
                                            by {selectedEvent.createdByName}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEdit(selectedEvent)}
                                    className="ascii-button text-xs"
                                >
                                    edit
                                </button>
                                <button
                                    onClick={() => handleDelete(selectedEvent.id)}
                                    className="ascii-button-danger text-xs"
                                >
                                    delete
                                </button>
                                <button
                                    onClick={() => { setSelectedEvent(null); setIsEditingEvent(false); }}
                                    className="ascii-button text-xs"
                                >
                                    close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* UPCOMING LIST */}
            {!loading && events.length > 0 && (
                <div className="border border-neutral-700 p-4">
                    <h2 className="text-sm text-green-400 mb-3">{"> "}UPCOMING THIS MONTH</h2>
                    <div className="space-y-1">
                        {events
                            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                            .map(evt => (
                                <button
                                    key={evt.id}
                                    onClick={() => setSelectedEvent(evt)}
                                    className="flex items-center justify-between w-full py-1.5 border-b border-neutral-800 text-sm text-left cursor-pointer hover:bg-neutral-900/50"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${COLOR_DOT[evt.color] || COLOR_DOT.green}`} />
                                        <span className="text-white">{evt.title}</span>
                                    </div>
                                    <span className="text-neutral-500 text-xs">
                                        {new Date(evt.startDate).toLocaleDateString()}
                                    </span>
                                </button>
                            ))}
                    </div>
                </div>
            )}
        </section>
    );
}
