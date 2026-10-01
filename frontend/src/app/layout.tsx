import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Jost } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import CommandPalette from "./components/CommandPalette";
import PwaInit from "./components/PwaInit";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { NO_FLASH_SCRIPT } from "@/lib/theme";

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const jost = Jost({
    variable: "--font-jost",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "HDASH — Household Dashboard",
    description: "A self-hosted dashboard for shared living: chores, groceries, todos, calendar, money, and who's carrying what.",
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
        description: "Chores, groceries, the calendar and the money for a shared home — and a straight answer to \"are we even?\"",
        type: "website",
    },
};

export const viewport: Viewport = {
    themeColor: "#0a0a0a",
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
            </head>
            <body
                className={`${geistMono.variable} ${geistSans.variable} ${jost.variable} bg-background text-foreground font-mono antialiased`}
            >
                <ThemeProvider>
                    <AuthProvider>
                        <NavBar />
                        <CommandPalette />
                        <PwaInit />
                        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">{children}</main>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
