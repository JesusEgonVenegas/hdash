"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { MEMBER_DOT } from "../components/MemberDot";
import { getPushStatus, enablePush, disablePush, sendTestPush, type PushStatus } from "@/lib/push";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { Card, CardTitle, Hint, PageHeader, Field, TextInput, Button, ToggleRow } from "../components/ui";

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

    return (
        <section className="space-y-6">
            <PageHeader title="Settings" right={user?.displayName} />

            {error && <div className="ascii-error">{error}</div>}
            {flash && <div className="text-green-400 text-sm border border-green-500/30 px-3 py-2">{flash}</div>}

            {/* APPEARANCE */}
            <Card className="!space-y-3">
                <CardTitle>Appearance</CardTitle>
                <Hint>Theme applies instantly and is saved on this device.</Hint>
                <ThemeSwitcher />
            </Card>

            {/* PROFILE */}
            <Card>
                <CardTitle>Profile</CardTitle>
                <Field label="Display name">
                    <div className="flex gap-2">
                        <TextInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                        <Button
                            variant="primary"
                            onClick={saveProfile}
                            disabled={busy || !displayName.trim() || displayName.trim() === user?.displayName}
                        >
                            SAVE
                        </Button>
                    </div>
                </Field>
                <Field label="Your color">
                    <div className="flex gap-2">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => saveColor(c)}
                                aria-label={c}
                                className={`w-6 h-6 rounded-full ${MEMBER_DOT[c]} cursor-pointer ${
                                    (user?.color ?? "green") === c ? "ring-2 ring-white ring-offset-1 ring-offset-neutral-950" : "opacity-50 hover:opacity-100"
                                }`}
                            />
                        ))}
                    </div>
                </Field>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">{user?.email}</span>
                    {user?.emailConfirmed ? (
                        <span className="text-green-400 text-xs border border-green-500/30 px-2 py-0.5 rounded">✓ verified</span>
                    ) : (
                        <button onClick={resendVerification} disabled={busy} className="text-yellow-500 hover:text-yellow-400 text-xs underline disabled:opacity-40">
                            unverified — resend link
                        </button>
                    )}
                </div>
            </Card>

            {/* SECURITY */}
            <Card className="!space-y-3">
                <CardTitle>Security</CardTitle>
                <TextInput type="password" placeholder="current password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
                <TextInput type="password" placeholder="new password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                <TextInput type="password" placeholder="confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                <Button onClick={changePassword} disabled={busy || !curPw || !newPw}>
                    CHANGE PASSWORD
                </Button>
            </Card>

            {/* NOTIFICATIONS */}
            <Card>
                <div>
                    <CardTitle>Push notifications</CardTitle>
                    <Hint>Real-time nudges on this device — your turn for a chore, someone settled up with you.</Hint>
                </div>

                {push && !push.supported && (
                    <p className="text-neutral-600 text-xs">This browser doesn&rsquo;t support push notifications.</p>
                )}
                {push?.supported && !push.serverEnabled && (
                    <p className="text-yellow-500/80 text-xs"><span className="text-yellow-400">[!]</span> Push isn&rsquo;t configured on the server.</p>
                )}

                {push?.supported && push.serverEnabled && (
                    <>
                        <ToggleRow
                            label="Notify me on this device"
                            on={push.subscribed}
                            busy={pushBusy}
                            onClick={togglePush}
                        />
                        {push.subscribed && (
                            <Button onClick={testPush} disabled={pushBusy}>SEND ME A TEST</Button>
                        )}
                    </>
                )}
            </Card>

            {/* DIGEST */}
            <Card>
                <div>
                    <CardTitle>Daily digest</CardTitle>
                    <Hint>
                        A once-a-day email rounding up what needs attention — chores, todos, the day&rsquo;s
                        calendar, the ledger, and the shopping list.
                    </Hint>
                </div>

                <ToggleRow
                    label="Email me the daily digest"
                    on={!!settings?.digestOptIn}
                    onClick={() => saveDigest({ digestOptIn: !settings!.digestOptIn }, !settings!.digestOptIn ? "Daily digest on." : "Daily digest off.")}
                />

                {settings?.digestOptIn && (
                    <label className="flex items-center justify-between w-full border border-neutral-800 rounded-lg px-3 py-2 text-sm">
                        <span className="text-neutral-400">Deliver at</span>
                        <select
                            value={settings.digestHour ?? ""}
                            onChange={(e) => saveDigest({ digestHour: e.target.value === "" ? null : Number(e.target.value) }, "Delivery time updated.")}
                            className="bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-1 focus:outline-none focus:border-green-400 rounded"
                        >
                            <option value="">household default ({hourLabel(settings.defaultHour)})</option>
                            {Array.from({ length: 24 }, (_, h) => (
                                <option key={h} value={h} className="bg-neutral-900">{hourLabel(h)}</option>
                            ))}
                        </select>
                    </label>
                )}

                <div className="flex flex-wrap gap-3">
                    <Button variant="primary" onClick={() => preview()} disabled={busy}>PREVIEW</Button>
                    <Button onClick={sendTest} disabled={busy}>SEND ME A TEST</Button>
                </div>

                {settings?.skins && settings.skins.length > 0 && (
                    <div className="border-t border-neutral-800 pt-3">
                        <div className="text-neutral-500 text-xs mb-2">Preview an email skin (opens in a new tab):</div>
                        <div className="flex flex-wrap gap-2">
                            {settings.skins.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => preview(s)}
                                    disabled={busy}
                                    className={`px-2 py-1 border text-xs disabled:opacity-40 rounded ${
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
                    <div>active email skin: <span className="text-neutral-400">{settings?.activeSkin}</span> <span className="text-neutral-700">· set via Digest:Skin (use &ldquo;auto&rdquo; for weekday + Sunday-Herald)</span></div>
                    <div>
                        daily delivery:{" "}
                        <span className={settings?.schedulerEnabled ? "text-green-400" : "text-yellow-500"}>
                            {settings?.schedulerEnabled ? "scheduled" : "off (dev — set Digest:Enabled)"}
                        </span>
                    </div>
                </div>
            </Card>
        </section>
    );
}
