"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import AuthShell from "../components/AuthShell";

export default function VerifyEmailPage() {
    return (
        <Suspense>
            <Verify />
        </Suspense>
    );
}

function Verify() {
    const params = useSearchParams();
    const email = params.get("email") ?? "";
    const token = params.get("token") ?? "";
    const [state, setState] = useState<"working" | "ok" | "error">("working");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!email || !token) {
            setState("error");
            setMessage("This confirmation link is incomplete.");
            return;
        }
        apiFetch<{ message: string }>("/api/auth/confirm-email", {
            method: "POST",
            body: { email, token },
        })
            .then((r) => {
                setState("ok");
                setMessage(r.message);
            })
            .catch((err) => {
                setState("error");
                setMessage(
                    err instanceof ApiError && Array.isArray(err.data?.errors)
                        ? (err.data.errors as string[])[0]
                        : "This confirmation link is invalid or expired."
                );
            });
    }, [email, token]);

    return (
        <AuthShell title="> CONFIRM EMAIL">
            {state === "working" && <p className="text-neutral-500 text-sm">Confirming {email}...</p>}
            {state === "ok" && (
                <div className="space-y-4 text-sm">
                    <p className="text-green-400 border border-green-500/30 p-3">{message} ✓</p>
                    <Link href="/login" className="text-green-400 underline">→ Sign in</Link>
                </div>
            )}
            {state === "error" && (
                <div className="space-y-4 text-sm">
                    <p className="text-red-400 border border-red-500/50 bg-red-500/10 p-3">[ERROR] {message}</p>
                    <Link href="/login" className="text-green-400 underline">← Back to login</Link>
                </div>
            )}
        </AuthShell>
    );
}
