import type { ReactNode } from "react";

const LOGO = ` ██╗  ██╗██████╗  █████╗ ███████╗██╗  ██╗
 ██║  ██║██╔══██╗██╔══██╗██╔════╝██║  ██║
 ███████║██║  ██║███████║███████╗███████║
 ██╔══██║██║  ██║██╔══██║╚════██║██╔══██║
 ██║  ██║██████╔╝██║  ██║███████║██║  ██║
 ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝`;

/** Shared frame for the unauthenticated auth pages — matches the login screen. */
export default function AuthShell({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <pre className="mb-8 text-green-400 text-xs leading-tight whitespace-pre">{LOGO}</pre>
                <div className="border border-neutral-700 p-6">
                    <h1 className="text-lg mb-6 text-green-400">{title}</h1>
                    {children}
                </div>
            </div>
        </div>
    );
}
