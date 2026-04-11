"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInit() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Register service worker
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .catch(() => {/* sw registration is best-effort */});
        }

        // Capture install prompt
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
            // Only show if not already installed and not dismissed before
            if (!localStorage.getItem("pwa-dismissed")) {
                setShowBanner(true);
            }
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    async function handleInstall() {
        if (!installPrompt) return;
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === "dismissed") {
            localStorage.setItem("pwa-dismissed", "1");
        }
        setShowBanner(false);
        setInstallPrompt(null);
    }

    function handleDismiss() {
        localStorage.setItem("pwa-dismissed", "1");
        setShowBanner(false);
    }

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 border border-green-400/40 bg-neutral-950 p-4 z-50 shadow-lg">
            <p className="text-sm text-neutral-300 mb-3">
                <span className="text-green-400">[!]</span> Install HDASH as an app for quick access
            </p>
            <div className="flex gap-2">
                <button
                    onClick={handleInstall}
                    className="border border-green-400 px-4 py-1.5 text-sm text-green-400 hover:bg-green-400/10 cursor-pointer"
                >
                    [ install ]
                </button>
                <button
                    onClick={handleDismiss}
                    className="border border-neutral-700 px-4 py-1.5 text-sm text-neutral-500 hover:border-neutral-500 cursor-pointer"
                >
                    dismiss
                </button>
            </div>
        </div>
    );
}
