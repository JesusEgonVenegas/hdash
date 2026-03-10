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

    // forms
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
            <section className="text-white font-mono p-6">
                <p className="text-neutral-500">loading...</p>
            </section>
        );
    }

    const isOwner = user?.id === household?.ownerId;

    // NO HOUSEHOLD — show create/join forms
    if (!household) {
        return (
            <section className="text-white font-mono space-y-6">
                <header className="ascii-panel p-4">
                    <h1 className="text-xl font-bold">Household</h1>
                    <p className="text-neutral-400 text-sm mt-1">
                        Create a new household or join an existing one with an invite code.
                    </p>
                </header>

                {error && (
                    <div className="ascii-panel p-3 border-red-500 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* CREATE */}
                <div className="ascii-panel p-4 space-y-3">
                    <h2 className="text-neutral-300 text-sm">create household</h2>
                    <form onSubmit={handleCreate} className="flex gap-2">
                        <input
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            placeholder="household name"
                            className="flex-1 bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="ascii-button text-sm disabled:opacity-50"
                        >
                            {submitting ? "..." : "create"}
                        </button>
                    </form>
                </div>

                {/* JOIN */}
                <div className="ascii-panel p-4 space-y-3">
                    <h2 className="text-neutral-300 text-sm">join household</h2>
                    <form onSubmit={handleJoin} className="flex gap-2">
                        <input
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            placeholder="invite code"
                            maxLength={6}
                            className="w-32 bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm uppercase tracking-widest text-center focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="ascii-button text-sm disabled:opacity-50"
                        >
                            {submitting ? "..." : "join"}
                        </button>
                    </form>
                </div>
            </section>
        );
    }

    // HAS HOUSEHOLD — show management view
    return (
        <section className="text-white font-mono space-y-6">
            <header className="ascii-panel p-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold">{household.name}</h1>
                        <p className="text-neutral-500 text-xs mt-1">
                            created {new Date(household.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <button
                        onClick={handleLeave}
                        disabled={submitting}
                        className="text-red-400 hover:text-red-300 text-sm border border-red-600 px-2 py-1 disabled:opacity-50"
                    >
                        leave
                    </button>
                </div>
            </header>

            {error && (
                <div className="ascii-panel p-3 border-red-500 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* INVITE CODE */}
            <div className="ascii-panel p-4">
                <div className="text-neutral-400 text-sm mb-2">invite code</div>
                <div className="flex items-center gap-3">
                    <span className="text-2xl tracking-[0.3em] text-green-400 font-bold">
                        {household.inviteCode}
                    </span>
                    <button
                        onClick={copyInviteCode}
                        className="text-neutral-500 hover:text-white text-sm border border-neutral-600 px-2 py-0.5"
                    >
                        copy
                    </button>
                    {isOwner && (
                        <button
                            onClick={handleRegenerateInvite}
                            disabled={submitting}
                            className="text-neutral-500 hover:text-yellow-400 text-sm border border-neutral-600 px-2 py-0.5 disabled:opacity-50"
                        >
                            regenerate
                        </button>
                    )}
                </div>
            </div>

            {/* MEMBERS */}
            <div className="ascii-panel p-4">
                <div className="text-neutral-400 text-sm mb-2">
                    members ({household.members.length})
                </div>
                <div className="space-y-2">
                    {household.members.map((member) => (
                        <div
                            key={member.id}
                            className="flex justify-between items-center border-b border-neutral-700 pb-2"
                        >
                            <div>
                                <span className="text-white">{member.displayName}</span>
                                <span className="text-neutral-500 text-xs ml-2">{member.email}</span>
                                {member.isOwner && (
                                    <span className="text-yellow-400 text-xs ml-2">[owner]</span>
                                )}
                                {member.id === user?.id && (
                                    <span className="text-green-400 text-xs ml-2">[you]</span>
                                )}
                            </div>

                            {isOwner && member.id !== user?.id && (
                                <button
                                    onClick={() => handleKick(member.id, member.displayName)}
                                    disabled={submitting}
                                    className="text-red-400 hover:text-red-300 text-xs border border-red-600 px-2 py-0.5 disabled:opacity-50"
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
                <div className="ascii-panel p-4 space-y-3">
                    <div className="text-neutral-400 text-sm">owner controls</div>
                    <form onSubmit={handleRename} className="flex gap-2">
                        <input
                            value={renameName}
                            onChange={(e) => setRenameName(e.target.value)}
                            className="flex-1 bg-neutral-900 border border-neutral-600 px-2 py-1 text-sm focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="ascii-button text-sm disabled:opacity-50"
                        >
                            rename
                        </button>
                    </form>
                </div>
            )}
        </section>
    );
}
