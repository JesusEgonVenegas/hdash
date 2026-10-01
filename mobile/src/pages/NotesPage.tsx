import { useState, useEffect, useRef } from "react";
import { notes } from "../lib/db";
import type { Note, NoteColor } from "../lib/db";

const NOTE_COLORS: { id: NoteColor; hex: string; label: string }[] = [
    { id: "default", hex: "#262626", label: "NONE"   },
    { id: "green",   hex: "#4ade80", label: "GREEN"  },
    { id: "cyan",    hex: "#22d3ee", label: "CYAN"   },
    { id: "orange",  hex: "#fb923c", label: "ORANGE" },
    { id: "pink",    hex: "#f472b6", label: "PINK"   },
    { id: "amber",   hex: "#fbbf24", label: "AMBER"  },
];

const colorBorder: Record<NoteColor, string> = {
    default: "#1f1f1f",
    green:   "rgba(74,222,128,0.35)",
    cyan:    "rgba(34,211,238,0.35)",
    orange:  "rgba(251,146,60,0.35)",
    pink:    "rgba(244,114,182,0.35)",
    purple:  "rgba(167,139,250,0.35)",
    amber:   "rgba(251,191,36,0.35)",
};

const colorText: Record<NoteColor, string> = {
    default: "#737373",
    green:   "#4ade80",
    cyan:    "#22d3ee",
    orange:  "#fb923c",
    pink:    "#f472b6",
    purple:  "#a78bfa",
    amber:   "#fbbf24",
};

function formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return "just now";
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Editor Modal ─────────────────────────────────────────────────────────────

function NoteEditor({
    initial,
    onSave,
    onClose,
}: {
    initial?: Note;
    onSave: (title: string, content: string, color: NoteColor) => void;
    onClose: () => void;
}) {
    const [title,   setTitle]   = useState(initial?.title   ?? "");
    const [content, setContent] = useState(initial?.content ?? "");
    const [color,   setColor]   = useState<NoteColor>(initial?.color ?? "default");
    const contentRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!initial) contentRef.current?.focus();
    }, [initial]);

    function handleSave() {
        if (!content.trim() && !title.trim()) return;
        onSave(title.trim(), content.trim(), color);
    }

    return (
        <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col">
            {/* toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                <button onClick={onClose} className="text-[var(--color-muted)] text-sm tracking-wider">← BACK</button>
                <div className="flex gap-1">
                    {NOTE_COLORS.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setColor(c.id)}
                            style={{ background: c.hex }}
                            className={`w-5 h-5 rounded-full transition-all ${color === c.id ? "ring-2 ring-white ring-offset-1 ring-offset-[#0a0a0a] scale-110" : "opacity-50"}`}
                        />
                    ))}
                </div>
                <button
                    onClick={handleSave}
                    className="text-[10px] tracking-widest font-bold"
                    style={{ color: "var(--color-accent)" }}
                >
                    SAVE
                </button>
            </div>

            {/* title */}
            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="input-field border-0 border-b text-base font-bold bg-transparent px-4 py-3"
                style={{ borderColor: "var(--color-border)" }}
            />

            {/* content */}
            <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing..."
                className="flex-1 input-field border-0 bg-transparent px-4 py-3 resize-none text-sm leading-relaxed"
            />

            {/* char count */}
            <div className="px-4 py-2 text-[10px] text-[var(--color-muted)] border-t border-[var(--color-border)]">
                {content.length} chars
            </div>
        </div>
    );
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({ note, onEdit, onPin, onDelete }: {
    note: Note;
    onEdit: () => void;
    onPin: () => void;
    onDelete: () => void;
}) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className="border mx-3 my-2 overflow-hidden"
            style={{ borderColor: colorBorder[note.color] }}
        >
            {/* header */}
            <div
                className="flex items-start gap-3 p-3 active:opacity-80"
                onClick={() => { setShowActions(false); onEdit(); }}
            >
                <div className="flex-1 min-w-0">
                    {note.title && (
                        <div className="text-xs font-bold tracking-wider mb-1 truncate" style={{ color: note.color !== "default" ? colorText[note.color] : "var(--color-text)" }}>
                            {note.title}
                        </div>
                    )}
                    <div className="text-xs text-neutral-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                        {note.content || <span className="text-neutral-700 italic">empty</span>}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    {note.pinned && <span className="text-[10px]" style={{ color: "var(--color-accent)" }}>📌</span>}
                    <span className="text-[9px] text-neutral-700">{formatRelative(note.updatedAt)}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowActions(v => !v); }}
                        className="text-neutral-700 text-sm px-1 active:text-white"
                    >
                        •••
                    </button>
                </div>
            </div>

            {/* actions */}
            {showActions && (
                <div className="flex border-t border-[var(--color-border)]">
                    <button onClick={() => { onPin(); setShowActions(false); }}
                        className="flex-1 py-2 text-[10px] tracking-wider text-neutral-500 border-r border-[var(--color-border)] active:bg-neutral-900">
                        {note.pinned ? "UNPIN" : "PIN"}
                    </button>
                    <button onClick={() => { onEdit(); setShowActions(false); }}
                        className="flex-1 py-2 text-[10px] tracking-wider border-r border-[var(--color-border)] active:bg-neutral-900"
                        style={{ color: "var(--color-accent)" }}>
                        EDIT
                    </button>
                    <button onClick={() => onDelete()}
                        className="flex-1 py-2 text-[10px] tracking-wider text-red-400 active:bg-neutral-900">
                        DELETE
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function NotesPage() {
    const [list,    setList]    = useState<Note[]>([]);
    const [editing, setEditing] = useState<Note | null | "new">(null);
    const [search,  setSearch]  = useState("");

    function refresh() { setList(notes.list()); }
    useEffect(refresh, []);

    const filtered = search.trim()
        ? list.filter((n) =>
            n.title.toLowerCase().includes(search.toLowerCase()) ||
            n.content.toLowerCase().includes(search.toLowerCase())
          )
        : list;

    function handleSave(title: string, content: string, color: NoteColor) {
        if (editing === "new") {
            notes.add(title, content, color);
        } else if (editing) {
            notes.update(editing.id, { title, content, color });
        }
        setEditing(null);
        refresh();
    }

    if (editing !== null) {
        return (
            <NoteEditor
                initial={editing === "new" ? undefined : editing}
                onSave={handleSave}
                onClose={() => setEditing(null)}
            />
        );
    }

    return (
        <div>
            {/* header */}
            <div className="page-header">
                <span className="page-title">&gt; NOTES</span>
                <button
                    onClick={() => setEditing("new")}
                    className="text-[10px] tracking-widest font-bold"
                    style={{ color: "var(--color-accent)" }}
                >
                    + NEW
                </button>
            </div>

            {/* search */}
            {list.length > 3 && (
                <div className="px-3 py-2 border-b border-[var(--color-border)]">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search notes..."
                        className="input-field text-xs py-2"
                    />
                </div>
            )}

            {/* list */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📝</div>
                    <div className="empty-state-title">NO NOTES YET</div>
                    <div className="empty-state-hint">Tap + NEW to create your first note</div>
                </div>
            ) : (
                <div className="pb-4">
                    {filtered.map((note) => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            onEdit={() => setEditing(note)}
                            onPin={() => { notes.update(note.id, { pinned: !note.pinned }); refresh(); }}
                            onDelete={() => { notes.remove(note.id); refresh(); }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
