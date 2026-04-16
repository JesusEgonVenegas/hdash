import { useState, useEffect } from "react";
import { members } from "../lib/db";
import type { Member } from "../lib/db";
import { Avatar } from "../components/Avatar";

function AddBar({ onAdd }: { onAdd: (name: string) => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");

    function submit() {
        if (!name.trim()) return;
        onAdd(name.trim());
        setName("");
        setOpen(false);
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-full border-b border-[var(--color-border)] px-4 py-3 text-left text-xs tracking-widest active:bg-neutral-900"
                style={{ color: "var(--color-accent)" }}
            >
                + ADD MEMBER
            </button>
        );
    }

    return (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex flex-col gap-2">
            <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Name (e.g. Alex, Mom, Roommate 2)"
                className="input-field"
            />
            <div className="flex gap-2">
                <button onClick={submit} className="btn-primary flex-1">ADD</button>
                <button onClick={() => setOpen(false)} className="btn-ghost flex-1">CANCEL</button>
            </div>
        </div>
    );
}

export function MembersPage() {
    const [list, setList] = useState<Member[]>([]);

    function refresh() { setList(members.list()); }
    useEffect(refresh, []);

    return (
        <div>
            <div className="page-header">
                <span className="page-title">&gt; MEMBERS</span>
                <span className="label">{list.length} PEOPLE</span>
            </div>

            <AddBar onAdd={(n) => { members.add(n); refresh(); }} />

            {list.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <div className="empty-state-title">NO MEMBERS YET</div>
                    <div className="empty-state-hint">Add the people in your household to assign todos and chores</div>
                </div>
            ) : (
                list.map((m) => (
                    <div key={m.id} className="list-row">
                        <Avatar member={m} />
                        <div className="flex-1">
                            <div className="text-sm">{m.name}</div>
                        </div>
                        <button
                            onClick={() => { members.remove(m.id); refresh(); }}
                            className="text-[var(--color-border)] text-lg px-2 active:text-red-400"
                        >
                            ×
                        </button>
                    </div>
                ))
            )}

            {list.length > 0 && (
                <div className="px-4 py-4 text-[10px] text-[var(--color-muted)] leading-relaxed">
                    Members can be assigned to todos and chores. Removing a member unassigns them but does not delete their tasks.
                </div>
            )}
        </div>
    );
}
