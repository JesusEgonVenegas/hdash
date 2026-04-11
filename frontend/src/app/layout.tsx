import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import PwaInit from "./components/PwaInit";
import { AuthProvider } from "@/lib/auth-context";

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "HDASH — Household Dashboard",
    description: "Terminal-style household management. Track groceries, todos, chores, calendar, and debts with your household.",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "HDASH",
    },
    icons: {
        icon: "/icon.svg",
        apple: "/apple-touch-icon.svg",
    },
    openGraph: {
        title: "HDASH — Household Dashboard",
        description: "Terminal-style household management for people who hate bloated apps.",
        type: "website",
    },
};

export const viewport: Viewport = {
    themeColor: "#0a0a0a",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistMono.variable} bg-neutral-950 text-white font-mono antialiased`}
            >
                <AuthProvider>
                    <NavBar />
                    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">{children}</main>
                    <PwaInit />
                </AuthProvider>
            </body>
        </html>
    );
}
