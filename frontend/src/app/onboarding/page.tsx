"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

type Mode = "choose" | "create" | "join";

export default function OnboardingPage() {
    const { token, refreshUser } = useAuth();
    const router = useRouter();

    const [mode, setMode] = useState<Mode>("choose");
    const [householdName, setHouseholdName] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleCreate(e: FormEvent) {
        e.preventDefault();
        if (!householdName.trim()) return;
        setSubmitting(true);
        setError(null);

        try {
            await apiFetch("/api/household", {
                method: "POST",
                body: { name: householdName.trim() },
                token,
            });
            await refreshUser();
            router.push("/");
        } catch (err: any) {
            setError(err.data?.message ?? err.data?.error ?? "Failed to create household");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleJoin(e: FormEvent) {
        e.preventDefault();
        if (!inviteCode.trim()) return;
        setSubmitting(true);
        setError(null);

        try {
            await apiFetch("/api/household/join", {
                method: "POST",
                body: { inviteCode: inviteCode.trim().toUpperCase() },
                token,
            });
            await refreshUser();
            router.push("/");
        } catch (err: any) {
            setError(err.data?.message ?? err.data?.error ?? "Invalid invite code");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 -mt-6">
            <div className="w-full max-w-md">
                <pre className="mb-8 text-green-400 text-xs leading-tight whitespace-pre">
{` ██╗  ██╗██████╗  █████╗ ███████╗██╗  ██╗
 ██║  ██║██╔══██╗██╔══██╗██╔════╝██║  ██║
 ███████║██║  ██║███████║███████╗███████║
 ██╔══██║██║  ██║██╔══██║╚════██║██╔══██║
 ██║  ██║██████╔╝██║  ██║███████║██║  ██║
 ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝`}
                </pre>

                <div className="border border-neutral-700 p-6">
                    <h1 className="text-lg mb-2 text-green-400">
                        {"> "}HOUSEHOLD SETUP
                    </h1>
                    <p className="text-neutral-500 text-sm mb-6">
                        Households let you share grocery lists, todos, chores, and expenses with your housemates.
                    </p>

                    {error && (
                        <div className="mb-4 border border-red-500/50 bg-red-500/10 p-3 text-red-400 text-sm">
                            [ERROR] {error}
                        </div>
                    )}

                    {/* CHOOSE MODE */}
                    {mode === "choose" && (
                        <div className="space-y-3">
                            <button
                                onClick={() => setMode("create")}
                                className="w-full border border-green-400 py-2 text-green-400 hover:bg-green-400/10 cursor-pointer text-sm"
                            >
                                [ CREATE HOUSEHOLD ]
                            </button>
                            <button
                                onClick={() => setMode("join")}
                                className="w-full border border-neutral-500 py-2 text-neutral-300 hover:bg-neutral-800 cursor-pointer text-sm"
                            >
                                [ JOIN WITH INVITE CODE ]
                            </button>
                        </div>
                    )}

                    {/* CREATE MODE */}
                    {mode === "create" && (
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">
                                    HOUSEHOLD NAME:
                                </label>
                                <input
                                    value={householdName}
                                    onChange={(e) => setHouseholdName(e.target.value)}
                                    placeholder="The Apartment, Casa Smith..."
                                    required
                                    autoFocus
                                    className="ascii-input w-full"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting || !householdName.trim()}
                                className="w-full border border-green-400 py-2 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer text-sm"
                            >
                                {submitting ? "Creating..." : "[ CREATE ]"}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode("choose"); setError(null); }}
                                className="text-neutral-500 hover:text-neutral-300 text-sm cursor-pointer"
                            >
                                &larr; back
                            </button>
                        </form>
                    )}

                    {/* JOIN MODE */}
                    {mode === "join" && (
                        <form onSubmit={handleJoin} className="space-y-4">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">
                                    INVITE CODE:
                                </label>
                                <input
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                    placeholder="ABC123"
                                    required
                                    autoFocus
                                    className="ascii-input w-full uppercase"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting || !inviteCode.trim()}
                                className="w-full border border-green-400 py-2 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer text-sm"
                            >
                                {submitting ? "Joining..." : "[ JOIN ]"}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode("choose"); setError(null); }}
                                className="text-neutral-500 hover:text-neutral-300 text-sm cursor-pointer"
                            >
                                &larr; back
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link
                            href="/"
                            className="text-neutral-500 hover:text-neutral-300 text-sm"
                        >
                            skip for now &rarr;
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
