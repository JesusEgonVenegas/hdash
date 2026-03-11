"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { Household } from "@/types/household";

export default function HouseholdPage() {
    const { token, user, isLoading, refreshUser } = useAuth();
    const [household, setHousehold] = useState<Household | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [createName, setCreateName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [renameName, setRenameName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const loadHousehold = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiFetch<Household>("/api/household", { token });
            setHousehold(data);
            setRenameName(data.name);
            setError(null);
        } catch {
            setHousehold(null);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (isLoading || !token) return;
        loadHousehold();
    }, [token, isLoading, loadHousehold]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!createName.trim()) return;
        setSubmitting(true);
        setError(null);

        try {
            await apiFetch("/api/household", {
                method: "POST",
                body: { name: createName.trim() },
                token,
            });
            await refreshUser();
            await loadHousehold();
            setCreateName("");
        } catch (err: any) {
            setError(err.data?.message ?? err.message ?? "Failed to create household");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleJoin(e: React.FormEvent) {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setSubmitting(true);
        setError(null);

        try {
            await apiFetch("/api/household/join", {
                method: "POST",
                body: { inviteCode: joinCode.trim().toUpperCase() },
                token,
            });
            await refreshUser();
            await loadHousehold();
            setJoinCode("");
        } catch (err: any) {
            setError(err.data?.message ?? err.message ?? "Failed to join household");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleLeave() {
        if (!confirm("Leave this household? Your debts will remain yours.")) return;
        setSubmitting(true);
        setError(null);

        try {
            await apiFetch("/api/household/leave", {
                method: "POST",
                token,
            });
            await refreshUser();
            setHousehold(null);
        } catch (err: any) {
            setError(err.data?.message ?? err.message ?? "Failed to leave");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleRename(e: React.FormEvent) {
        e.preventDefault();
        if (!renameName.trim()) return;
        setSubmitting(true);
        setError(null);

        try {
            await apiFetch("/api/household", {
                method: "PUT",
                body: { name: renameName.trim() },
                token,
            });
            await refreshUser();
            await loadHousehold();
        } catch (err: any) {
            setError(err.data?.message ?? err.message ?? "Failed to rename");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleRegenerateInvite() {
        setSubmitting(true);
        setError(null);

        try {
            await apiFetch("/api/household/regenerate-invite", {
                method: "POST",
                token,
            });
            await loadHousehold();
        } catch (err: any) {
            setError(err.data?.message ?? err.message ?? "Failed to regenerate code");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleKick(userId: string, displayName: string) {
        if (!confirm(`Remove ${displayName} from the household?`)) return;
        setSubmitting(true);
        setError(null);

        try {
            await apiFetch(`/api/household/kick/${userId}`, {
                method: "DELETE",
                token,
            });
            await loadHousehold();
        } catch (err: any) {
            setError(err.data?.message ?? err.message ?? "Failed to remove member");
        } finally {
            setSubmitting(false);
        }
    }

    function copyInviteCode() {
        if (household?.inviteCode) {
            navigator.clipboard.writeText(household.inviteCode);
        }
    }

    if (isLoading || loading) {
        return (
            <section className="space-y-6">
                <div className="border border-neutral-700 p-4">
                    <h1 className="text-lg text-green-400">{"> "}HOUSEHOLD</h1>
                </div>
                <p className="text-neutral-500 text-sm">loading...</p>
            </section>
        );
    }

    const isOwner = user?.id === household?.ownerId;

    // NO HOUSEHOLD — show create/join
    if (!household) {
        return (
            <section className="space-y-6">
                <div className="border border-neutral-700 p-4">
                    <h1 className="text-lg text-green-400">{"> "}HOUSEHOLD</h1>
                    <p className="text-neutral-500 text-sm mt-1">
                        Create a new household or join an existing one with an invite code.
                    </p>
                </div>

                {error && (
                    <div className="ascii-error">
                        [ERROR] {error}
                    </div>
                )}

                {/* CREATE */}
                <div className="border border-neutral-700 p-6">
                    <h2 className="text-sm text-neutral-400 mb-4">CREATE HOUSEHOLD</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm text-neutral-400 mb-1">
                                HOUSEHOLD NAME:
                            </label>
                            <input
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                placeholder="The Apartment, Casa Smith..."
                                className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting || !createName.trim()}
                            className="w-full border border-green-400 py-2 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                        >
                            {submitting ? "Creating..." : "[ CREATE ]"}
                        </button>
                    </form>
                </div>

                {/* JOIN */}
                <div className="border border-neutral-700 p-6">
                    <h2 className="text-sm text-neutral-400 mb-4">JOIN WITH INVITE CODE</h2>
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label className="block text-sm text-neutral-400 mb-1">
                                INVITE CODE:
                            </label>
                            <input
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                placeholder="ABC123"
                                maxLength={6}
                                className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400 uppercase tracking-widest"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting || !joinCode.trim()}
                            className="w-full border border-green-400 py-2 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                        >
                            {submitting ? "Joining..." : "[ JOIN ]"}
                        </button>
                    </form>
                </div>
            </section>
        );
    }

    // HAS HOUSEHOLD — show management view
    return (
        <section className="space-y-6">
            <div className="border border-neutral-700 p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg text-green-400">{"> "}{household.name.toUpperCase()}</h1>
                        <p className="text-neutral-500 text-xs mt-1">
                            created {new Date(household.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <button
                        onClick={handleLeave}
                        disabled={submitting}
                        className="ascii-button-danger disabled:opacity-50"
                    >
                        [ LEAVE ]
                    </button>
                </div>
            </div>

            {error && (
                <div className="ascii-error">
                    [ERROR] {error}
                </div>
            )}

            {/* INVITE CODE */}
            <div className="border border-neutral-700 p-4">
                <div className="text-sm text-neutral-400 mb-3">INVITE CODE</div>
                <div className="flex items-center gap-4">
                    <span className="text-2xl tracking-[0.3em] text-green-400 font-bold">
                        {household.inviteCode}
                    </span>
                    <button
                        onClick={copyInviteCode}
                        className="ascii-button text-xs"
                    >
                        copy
                    </button>
                    {isOwner && (
                        <button
                            onClick={handleRegenerateInvite}
                            disabled={submitting}
                            className="ascii-button text-xs disabled:opacity-50"
                        >
                            regenerate
                        </button>
                    )}
                </div>
            </div>

            {/* MEMBERS */}
            <div className="border border-neutral-700 p-4">
                <div className="text-sm text-neutral-400 mb-3">
                    MEMBERS ({household.members.length})
                </div>
                <div className="space-y-1">
                    {household.members.map((member) => (
                        <div
                            key={member.id}
                            className="flex justify-between items-center py-2 border-b border-neutral-800"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-white text-sm">{member.displayName}</span>
                                <span className="text-neutral-600 text-xs">{member.email}</span>
                                {member.isOwner && (
                                    <span className="text-yellow-400 text-xs">[owner]</span>
                                )}
                                {member.id === user?.id && (
                                    <span className="text-green-400 text-xs">[you]</span>
                                )}
                            </div>

                            {isOwner && member.id !== user?.id && (
                                <button
                                    onClick={() => handleKick(member.id, member.displayName)}
                                    disabled={submitting}
                                    className="ascii-button-danger text-xs disabled:opacity-50"
                                >
                                    kick
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* OWNER CONTROLS */}
            {isOwner && (
                <div className="border border-neutral-700 p-6">
                    <div className="text-sm text-neutral-400 mb-4">RENAME HOUSEHOLD</div>
                    <form onSubmit={handleRename} className="space-y-4">
                        <input
                            value={renameName}
                            onChange={(e) => setRenameName(e.target.value)}
                            className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="border border-green-400 py-2 px-6 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                        >
                            {submitting ? "Saving..." : "[ RENAME ]"}
                        </button>
                    </form>
                </div>
            )}
        </section>
    );
}
