"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import AuthShell from "../components/AuthShell";

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetForm />
        </Suspense>
    );
}

function ResetForm() {
    const params = useSearchParams();
    const email = params.get("email") ?? "";
    const token = params.get("token") ?? "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);

    const linkValid = email.length > 0 && token.length > 0;

    async function submit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        if (password !== confirm) {
            setError("Passwords don't match.");
            return;
        }
        setBusy(true);
        try {
            await apiFetch("/api/auth/reset-password", {
                method: "POST",
                body: { email, token, newPassword: password },
            });
            setDone(true);
        } catch (err) {
            const msg =
                err instanceof ApiError && Array.isArray(err.data?.errors)
                    ? (err.data.errors as string[])[0]
                    : "Could not reset your password. The link may have expired.";
            setError(msg);
        } finally {
            setBusy(false);
        }
    }

    if (!linkValid) {
        return (
            <AuthShell title="> RESET PASSWORD">
                <p className="text-red-400 text-sm mb-4">[ERROR] This reset link is incomplete or invalid.</p>
                <Link href="/forgot-password" className="text-green-400 underline text-sm">
                    Request a new link
                </Link>
            </AuthShell>
        );
    }

    return (
        <AuthShell title="> RESET PASSWORD">
            {done ? (
                <div className="space-y-4 text-sm">
                    <p className="text-green-400 border border-green-500/30 p-3">Password updated.</p>
                    <Link href="/login" className="text-green-400 underline">
                        → Sign in
                    </Link>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-4">
                    <p className="text-neutral-500 text-sm">
                        New password for <span className="text-white">{email}</span>.
                    </p>
                    {error && (
                        <div className="border border-red-500/50 bg-red-500/10 p-3 text-red-400 text-sm">
                            [ERROR] {error}
                        </div>
                    )}
                    <div>
                        <label htmlFor="pw" className="block text-sm text-neutral-400 mb-1">NEW PASSWORD:</label>
                        <input
                            id="pw"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        />
                    </div>
                    <div>
                        <label htmlFor="pw2" className="block text-sm text-neutral-400 mb-1">CONFIRM:</label>
                        <input
                            id="pw2"
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white focus:outline-none focus:border-green-400"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full border border-green-400 py-2 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                    >
                        {busy ? "Updating..." : "[ SET NEW PASSWORD ]"}
                    </button>
                </form>
            )}
        </AuthShell>
    );
}
