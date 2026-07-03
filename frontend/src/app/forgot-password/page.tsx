"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import AuthShell from "../components/AuthShell";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);

    async function submit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        try {
            await apiFetch<{ message: string }>("/api/auth/forgot-password", {
                method: "POST",
                body: { email },
            });
        } catch {
            /* deliberately ignore — never reveal whether the account exists */
        } finally {
            setBusy(false);
            setSent(true);
        }
    }

    return (
        <AuthShell title="> RESET PASSWORD">
            {sent ? (
                <div className="space-y-4 text-sm">
                    <p className="text-green-400 border border-green-500/30 p-3">
                        If <span className="text-white">{email}</span> has an account, a reset link is on its way.
                    </p>
                    <p className="text-neutral-500">Check your inbox and follow the link to set a new password.</p>
                    <Link href="/login" className="text-green-400 underline">
                        ← Back to login
                    </Link>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-4">
                    <p className="text-neutral-500 text-sm">
                        Enter your email and we&rsquo;ll send you a link to reset your password.
                    </p>
                    <div>
                        <label htmlFor="email" className="block text-sm text-neutral-400 mb-1">EMAIL:</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="user@hdash.local"
                            className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full border border-green-400 py-2 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                    >
                        {busy ? "Sending..." : "[ SEND RESET LINK ]"}
                    </button>
                    <Link href="/login" className="block text-sm text-neutral-500 hover:text-neutral-300">
                        ← Back to login
                    </Link>
                </form>
            )}
        </AuthShell>
    );
}
