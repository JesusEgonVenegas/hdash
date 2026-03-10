"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") ?? "/";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await login({ email, password });
            router.push(callbackUrl);
        } catch (err: unknown) {
            if (err && typeof err === "object" && "status" in err) {
                const apiErr = err as { status: number };
                if (apiErr.status === 401) {
                    setError("Invalid email or password.");
                } else {
                    setError("Something went wrong. Try again.");
                }
            } else {
                setError("Could not connect to server.");
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
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
                    <h1 className="text-lg mb-6 text-green-400">
                        {"> "}SYSTEM LOGIN
                    </h1>

                    {error && (
                        <div className="mb-4 border border-red-500/50 bg-red-500/10 p-3 text-red-400 text-sm">
                            [ERROR] {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm text-neutral-400 mb-1"
                            >
                                EMAIL:
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="user@hdash.local"
                                required
                                className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm text-neutral-400 mb-1"
                            >
                                PASSWORD:
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="********"
                                required
                                className="w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full border border-green-400 py-2 text-green-400 hover:bg-green-400/10 disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? "Authenticating..." : "[ AUTHENTICATE ]"}
                        </button>
                    </form>

                    <div className="mt-4 text-sm text-neutral-500">
                        No account?{" "}
                        <Link
                            href="/register"
                            className="text-green-400 underline"
                        >
                            Register here
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
