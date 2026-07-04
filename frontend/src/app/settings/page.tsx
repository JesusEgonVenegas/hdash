"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { MEMBER_DOT } from "../components/MemberDot";
import { getPushStatus, enablePush, disablePush, sendTestPush, type PushStatus } from "@/lib/push";

const COLORS = ["green", "blue", "yellow", "pink", "purple", "orange", "cyan", "red"];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5063";

type Settings = {
    digestOptIn: boolean;
    digestHour: number | null;
    defaultHour: number;
    activeSkin: string;
    skins: string[];
    schedulerEnabled: boolean;
};

function hourLabel(h: number) {
    const period = h < 12 ? "am" : "pm";
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:00 ${period}`;
}

function firstError(e: unknown, fallback: string) {
    return e instanceof ApiError && Array.isArray(e.data?.errors)
        ? (e.data.errors as string[])[0]
        : fallback;
}

export default function SettingsPage() {
    const { token, isLoading, user, refreshUser } = useAuth();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [busy, setBusy] = useState(false);
    const [flash, setFlash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Push notification state
    const [push, setPush] = useState<PushStatus | null>(null);
    const [pushBusy, setPushBusy] = useState(false);

    // Profile + security form state
    const [displayName, setDisplayName] = useState("");
    const [curPw, setCurPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");

    useEffect(() => {
        if (isLoading || !token) return;
        apiFetch<Settings>("/api/digest/settings", { token })
            .then(setSettings)
            .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    }, [token, isLoading]);

    useEffect(() => {
        if (user?.displayName) setDisplayName(user.displayName);
    }, [user?.displayName]);

    useEffect(() => {
        if (!token) return;
        getPushStatus(token).then(setPush).catch(() => setPush({ supported: false, serverEnabled: false, subscribed: false }));
    }, [token]);

    async function togglePush() {
        if (!token || !push) return;
        setPushBusy(true);
        setError(null);
        try {
            if (push.subscribed) {
                await disablePush(token);
                flashMsg("Push notifications off.");
            } else {
                await enablePush(token);
                flashMsg("Push notifications on — you'll get nudges on this device.");
            }
            setPush(await getPushStatus(token));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not update notifications.");
        } finally {
            setPushBusy(false);
        }
    }

    async function testPush() {
        if (!token) return;
        setPushBusy(true);
        try {
            await sendTestPush(token);
            flashMsg("Test sent — watch for a notification.");
        } catch {
            setError("Could not send the test push.");
        } finally {
            setPushBusy(false);
        }
    }

    function flashMsg(m: string) {
        setError(null);
        setFlash(m);
        setTimeout(() => setFlash(null), 4000);
    }

    async function saveDigest(patch: Partial<Pick<Settings, "digestOptIn" | "digestHour">>, note: string) {
        if (!settings || !token) return;
        const prev = settings;
        const next = { ...settings, ...patch };
        setSettings(next);
        try {
            await apiFetch("/api/digest/settings", {
                token,
                method: "PUT",
                body: { digestOptIn: next.digestOptIn, digestHour: next.digestHour },
            });
            flashMsg(note);
        } catch {
            setSettings(prev);
            setError("Could not save that.");
        }
    }

    async function saveProfile() {
        if (!token || !displayName.trim()) return;
        setBusy(true);
        try {
            await apiFetch("/api/auth/profile", { token, method: "PUT", body: { displayName: displayName.trim() } });
            await refreshUser();
            flashMsg("Profile updated.");
        } catch (e) {
            setError(firstError(e, "Could not update profile."));
        } finally {
            setBusy(false);
        }
    }

    async function saveColor(c: string) {
        if (!token || !user) return;
        try {
            await apiFetch("/api/auth/profile", { token, method: "PUT", body: { displayName: user.displayName, color: c } });
            await refreshUser();
            flashMsg("Color updated.");
        } catch {
            setError("Could not update color.");
        }
    }

    async function changePassword() {
        if (!token) return;
        setError(null);
        if (newPw !== confirmPw) {
            setError("New passwords don't match.");
            return;
        }
        setBusy(true);
        try {
            await apiFetch("/api/auth/change-password", {
                token,
                method: "POST",
                body: { currentPassword: curPw, newPassword: newPw },
            });
            setCurPw("");
            setNewPw("");
            setConfirmPw("");
            flashMsg("Password changed.");
        } catch (e) {
            setError(firstError(e, "Could not change password."));
        } finally {
            setBusy(false);
        }
    }

    async function resendVerification() {
        if (!token) return;
        setBusy(true);
        try {
            const r = await apiFetch<{ message: string }>("/api/auth/resend-verification-self", { token, method: "POST" });
            flashMsg(r.message);
        } catch {
            setError("Could not send the verification email.");
        } finally {
            setBusy(false);
        }
    }

    async function preview(skin?: string) {
        if (!token) return;
        setBusy(true);
        try {
            const q = skin ? `?skin=${skin}` : "";
            const res = await fetch(`${API_BASE}/api/digest/preview${q}`, { headers: { Authorization: `Bearer ${token}` } });
            const html = await res.text();
            window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank");
        } catch {
            setError("Could not build a preview.");
        } finally {
            setBusy(false);
        }
    }

    async function sendTest() {
        if (!token) return;
        setBusy(true);
        try {
            const r = await apiFetch<{ message: string }>("/api/digest/send-test", { token, method: "POST" });
            flashMsg(r.message);
        } catch {
            setError("Could not send the test.");
        } finally {
            setBusy(false);
        }
    }

    if (isLoading || (!settings && !error)) return <p className="text-neutral-500 font-mono">loading...</p>;

    const inputCls =
        "w-full bg-transparent border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-green-400 text-sm";

    return (
        <section className="space-y-6 font-mono">
            <header className="flex items-baseline justify-between border-b border-neutral-700 pb-2">
                <h1 className="text-green-400 text-lg font-bold tracking-wider">SETTINGS</h1>
                <span className="text-neutral-500 text-sm">{user?.displayName}</span>
            </header>

            {error && <div className="text-red-400 text-sm border border-red-500/40 px-3 py-2">[ERROR] {error}</div>}
            {flash && <div className="text-green-400 text-sm border border-green-500/30 px-3 py-2">{flash}</div>}

            {/* PROFILE */}
            <div className="border border-neutral-800 p-4 space-y-4">
                <h2 className="text-sm text-neutral-300">{"> "}PROFILE</h2>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">DISPLAY NAME</label>
                    <div className="flex gap-2">
                        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
                        <button
                            onClick={saveProfile}
                            disabled={busy || !displayName.trim() || displayName.trim() === user?.displayName}
                            className="border border-green-400/60 text-green-400 hover:bg-green-400/10 px-3 text-sm disabled:opacity-30 whitespace-nowrap"
                        >
                            [ SAVE ]
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-neutral-500 mb-1">YOUR COLOR</label>
                    <div className="flex gap-2">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => saveColor(c)}
                                aria-label={c}
                                className={`w-6 h-6 rounded-full ${MEMBER_DOT[c]} cursor-pointer ${
                                    (user?.color ?? "green") === c ? "ring-2 ring-white ring-offset-1 ring-offset-black" : "opacity-50 hover:opacity-100"
                                }`}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">{user?.email}</span>
                    {user?.emailConfirmed ? (
                        <span className="text-green-400 text-xs border border-green-500/30 px-2 py-0.5">✓ verified</span>
                    ) : (
                        <button onClick={resendVerification} disabled={busy} className="text-yellow-500 hover:text-yellow-400 text-xs underline disabled:opacity-40">
                            unverified — resend link
                        </button>
                    )}
                </div>
            </div>

            {/* SECURITY */}
            <div className="border border-neutral-800 p-4 space-y-3">
                <h2 className="text-sm text-neutral-300">{"> "}SECURITY</h2>
                <input type="password" placeholder="current password" value={curPw} onChange={(e) => setCurPw(e.target.value)} className={inputCls} />
                <input type="password" placeholder="new password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={inputCls} />
                <input type="password" placeholder="confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={inputCls} />
                <button
                    onClick={changePassword}
                    disabled={busy || !curPw || !newPw}
                    className="border border-neutral-600 text-neutral-300 hover:border-neutral-400 px-3 py-1.5 text-sm disabled:opacity-30"
                >
                    [ CHANGE PASSWORD ]
                </button>
            </div>

            {/* NOTIFICATIONS */}
            <div className="border border-neutral-800 p-4 space-y-4">
                <div>
                    <h2 className="text-sm text-neutral-300">{"> "}PUSH NOTIFICATIONS</h2>
                    <p className="text-neutral-500 text-xs mt-1">
                        Real-time nudges on this device — your turn for a chore, someone settled up with you.
                    </p>
                </div>

                {push && !push.supported && (
                    <p className="text-neutral-600 text-xs">This browser doesn&rsquo;t support push notifications.</p>
                )}
                {push?.supported && !push.serverEnabled && (
                    <p className="text-yellow-500/80 text-xs"><span className="text-yellow-400">[!]</span> Push isn&rsquo;t configured on the server.</p>
                )}

                {push?.supported && push.serverEnabled && (
                    <>
                        <button
                            onClick={togglePush}
                            disabled={pushBusy}
                            className="flex items-center justify-between w-full border border-neutral-700 hover:border-neutral-500 px-3 py-2 text-sm disabled:opacity-40"
                        >
                            <span className="text-neutral-300">Notify me on this device</span>
                            <span className={push.subscribed ? "text-green-400" : "text-neutral-500"}>
                                {pushBusy ? "…" : push.subscribed ? "[ ON ]" : "[ OFF ]"}
                            </span>
                        </button>
                        {push.subscribed && (
                            <button onClick={testPush} disabled={pushBusy} className="border border-neutral-600 text-neutral-300 hover:border-neutral-400 px-3 py-1.5 text-sm disabled:opacity-40">
                                [ SEND ME A TEST ]
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* DIGEST */}
            <div className="border border-neutral-800 p-4 space-y-4">
                <div>
                    <h2 className="text-sm text-neutral-300">{"> "}DAILY DIGEST</h2>
                    <p className="text-neutral-500 text-xs mt-1">
                        A once-a-day email rounding up what needs attention — chores, todos, the day&rsquo;s
                        calendar, the ledger, and the shopping list.
                    </p>
                </div>

                <button
                    onClick={() => saveDigest({ digestOptIn: !settings!.digestOptIn }, !settings!.digestOptIn ? "Daily digest on." : "Daily digest off.")}
                    className="flex items-center justify-between w-full border border-neutral-700 hover:border-neutral-500 px-3 py-2 text-sm"
                >
                    <span className="text-neutral-300">Email me the daily digest</span>
                    <span className={settings?.digestOptIn ? "text-green-400" : "text-neutral-500"}>
                        {settings?.digestOptIn ? "[ ON ]" : "[ OFF ]"}
                    </span>
                </button>

                {settings?.digestOptIn && (
                    <label className="flex items-center justify-between w-full border border-neutral-800 px-3 py-2 text-sm">
                        <span className="text-neutral-400">Deliver at</span>
                        <select
                            value={settings.digestHour ?? ""}
                            onChange={(e) => saveDigest({ digestHour: e.target.value === "" ? null : Number(e.target.value) }, "Delivery time updated.")}
                            className="bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-1 focus:outline-none focus:border-green-400"
                        >
                            <option value="">household default ({hourLabel(settings.defaultHour)})</option>
                            {Array.from({ length: 24 }, (_, h) => (
                                <option key={h} value={h} className="bg-neutral-900">{hourLabel(h)}</option>
                            ))}
                        </select>
                    </label>
                )}

                <div className="flex flex-wrap gap-3">
                    <button onClick={() => preview()} disabled={busy} className="border border-green-400/60 text-green-400 hover:bg-green-400/10 px-3 py-1.5 text-sm disabled:opacity-40">
                        [ PREVIEW ]
                    </button>
                    <button onClick={sendTest} disabled={busy} className="border border-neutral-600 text-neutral-300 hover:border-neutral-400 px-3 py-1.5 text-sm disabled:opacity-40">
                        [ SEND ME A TEST ]
                    </button>
                </div>

                {settings?.skins && settings.skins.length > 0 && (
                    <div className="border-t border-neutral-800 pt-3">
                        <div className="text-neutral-500 text-xs mb-2">Preview a skin (opens in a new tab):</div>
                        <div className="flex flex-wrap gap-2">
                            {settings.skins.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => preview(s)}
                                    disabled={busy}
                                    className={`px-2 py-1 border text-xs disabled:opacity-40 ${
                                        s === settings.activeSkin
                                            ? "border-green-400 text-green-400"
                                            : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                                    }`}
                                >
                                    {s}{s === settings.activeSkin ? " ●" : ""}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-neutral-600 text-xs border-t border-neutral-800 pt-3 space-y-0.5">
                    <div>active skin: <span className="text-neutral-400">{settings?.activeSkin}</span> <span className="text-neutral-700">· set via Digest:Skin (use &ldquo;auto&rdquo; for weekday + Sunday-Herald)</span></div>
                    <div>
                        daily delivery:{" "}
                        <span className={settings?.schedulerEnabled ? "text-green-400" : "text-yellow-500"}>
                            {settings?.schedulerEnabled ? "scheduled" : "off (dev — set Digest:Enabled)"}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}
