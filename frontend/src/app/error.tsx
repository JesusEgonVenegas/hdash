"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
            <div className="border border-red-500/40 bg-red-500/5 p-8 max-w-md w-full text-center space-y-4">
                <div className="text-red-400 text-sm">[ERROR]</div>
                <h1 className="text-neutral-300 text-lg">{"> "}something went wrong</h1>
                <p className="text-neutral-500 text-sm">
                    {error.message || "An unexpected error occurred."}
                </p>
                {error.digest && (
                    <p className="text-neutral-700 text-xs font-mono">digest: {error.digest}</p>
                )}
                <div className="pt-2">
                    <button
                        onClick={reset}
                        className="border border-green-400 px-6 py-2 text-green-400 hover:bg-green-400/10 transition-colors text-sm cursor-pointer"
                    >
                        [ try again ]
                    </button>
                </div>
            </div>
            <p className="text-neutral-700 text-xs">HDASH</p>
        </div>
    );
}
