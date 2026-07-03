"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { HouseholdNote } from "@/types/note";

const COLORS: HouseholdNote["color"][] = ["yellow", "green", "blue", "pink"];

function NoteCard({
    note,
    onPin,
    onDelete,
    onSave,
}: {
    note: HouseholdNote;
    onPin: () => void;
    onDelete: () => void;
    onSave: (text: string) => Promise<void>;
}) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(note.content);

    async function save() {
        if (text.trim() && text.trim() !== note.content) await onSave(text.trim());
        setEditing(false);
    }

    return (
        <div className={`border p-3 flex flex-col gap-2 ${NOTE_STYLE[note.color]}`}>
            <div className="flex items-start justify-between gap-2">
                {editing ? (
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        autoFocus
                        rows={3}
                        className="flex-1 bg-black/20 border border-white/20 px-2 py-1 text-neutral-100 text-sm resize-none focus:outline-none focus:border-green-400"
                    />
                ) : (
                    <p className="text-neutral-100 text-sm whitespace-pre-wrap break-words flex-1">{note.content}</p>
                )}
                <button
                    onClick={onPin}
                    title={note.pinned ? "unpin" : "pin"}
                    className={`shrink-0 text-sm cursor-pointer ${note.pinned ? "text-white" : "text-neutral-600 hover:text-neutral-300"}`}
                >
                    📌
                </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-auto pt-1 border-t border-white/10">
                <span>
                    {note.createdByName ?? "someone"} · {new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="flex items-center gap-2">
                    {editing ? (
                        <>
                            <button onClick={save} className="text-green-400 hover:text-green-300 cursor-pointer">save</button>
                            <button onClick={() => { setText(note.content); setEditing(false); }} className="text-neutral-600 hover:text-neutral-300 cursor-pointer">cancel</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setEditing(true)} className="text-neutral-600 hover:text-neutral-300 cursor-pointer">edit</button>
                            <button onClick={onDelete} className="text-neutral-600 hover:text-red-400 cursor-pointer">×</button>
                        </>
                    )}
                </span>
            </div>
        </div>
    );
}

// Sticky-note surfaces — soft tint + matching border, legible in the dark UI.
const NOTE_STYLE: Record<HouseholdNote["color"], string> = {
    yellow: "bg-yellow-400/10 border-yellow-500/40",
    green: "bg-green-400/10 border-green-500/40",
    blue: "bg-blue-400/10 border-blue-500/40",
    pink: "bg-pink-400/10 border-pink-500/40",
};
const SWATCH: Record<HouseholdNote["color"], string> = {
    yellow: "bg-yellow-400",
    green: "bg-green-400",
    blue: "bg-blue-400",
    pink: "bg-pink-400",
};

export default function NotesPage() {
    const { token, user, isLoading } = useAuth();
    const [notes, setNotes] = useState<HouseholdNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [content, setContent] = useState("");
    const [color, setColor] = useState<HouseholdNote["color"]>("yellow");
    const [posting, setPosting] = useState(false);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            setNotes(await apiFetch<HouseholdNote[]>("/api/notes", { token }));
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load notes");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (isLoading || !token) return;
        load();
    }, [token, isLoading, load]);

    async function post(e: FormEvent) {
        e.preventDefault();
        if (!content.trim()) return;
        setPosting(true);
        try {
            const created = await apiFetch<HouseholdNote>("/api/notes", {
                method: "POST",
                body: { content: content.trim(), color },
                token,
            });
            setNotes((prev) => [created, ...prev]);
            setContent("");
        } catch {
            setError("Could not post that note.");
        } finally {
            setPosting(false);
        }
    }

    async function togglePin(n: HouseholdNote) {
        const updated = await apiFetch<HouseholdNote>(`/api/notes/${n.id}`, {
            method: "PUT",
            body: { pinned: !n.pinned },
            token,
        });
        setNotes((prev) =>
            [...prev.map((x) => (x.id === n.id ? updated : x))].sort(
                (a, b) => Number(b.pinned) - Number(a.pinned) || +new Date(b.updatedAt) - +new Date(a.updatedAt)
            )
        );
    }

    async function remove(id: string) {
        await apiFetch(`/api/notes/${id}`, { method: "DELETE", token });
        setNotes((prev) => prev.filter((n) => n.id !== id));
    }

    async function saveEdit(id: string, text: string) {
        const updated = await apiFetch<HouseholdNote>(`/api/notes/${id}`, {
            method: "PUT",
            body: { content: text },
            token,
        });
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    }

    if (isLoading || loading) return <p className="text-neutral-500 font-mono">loading...</p>;

    return (
        <section className="space-y-6 font-mono">
            <div className="flex items-baseline justify-between border-b border-neutral-700 pb-2">
                <h1 className="text-green-400 text-lg font-bold tracking-wider">PINBOARD</h1>
                <span className="text-neutral-500 text-sm">
                    {user?.householdName ?? "personal"} · {notes.length} note{notes.length !== 1 ? "s" : ""}
                </span>
            </div>

            {error && <div className="text-red-400 text-sm border border-red-500/40 px-3 py-2">[ERROR] {error}</div>}

            {/* NEW NOTE */}
            <form onSubmit={post} className="border border-neutral-800 p-4 space-y-3">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="leave a note for the house…"
                    rows={2}
                    className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400 resize-none text-sm"
                />
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                aria-label={c}
                                className={`w-6 h-6 rounded-full ${SWATCH[c]} cursor-pointer ${
                                    color === c ? "ring-2 ring-white ring-offset-1 ring-offset-black" : "opacity-50 hover:opacity-100"
                                }`}
                            />
                        ))}
                    </div>
                    <button
                        type="submit"
                        disabled={posting || !content.trim()}
                        className="border border-green-400 px-4 py-1.5 text-green-400 hover:bg-green-400/10 disabled:opacity-40 text-sm"
                    >
                        {posting ? "posting…" : "[ PIN IT ]"}
                    </button>
                </div>
            </form>

            {/* BOARD */}
            {notes.length === 0 ? (
                <div className="border border-neutral-800 p-8 text-center text-neutral-500 text-sm">
                    board&rsquo;s empty — leave the first note above.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {notes.map((n) => (
                        <NoteCard
                            key={n.id}
                            note={n}
                            onPin={() => togglePin(n)}
                            onDelete={() => remove(n.id)}
                            onSave={(text) => saveEdit(n.id, text)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
