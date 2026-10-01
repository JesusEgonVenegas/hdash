import type { Metadata } from "next";
import { Geist, Geist_Mono, Jost } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import CommandPalette from "./components/CommandPalette";
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
    title: "HDASH",
    description: "Household Dashboard",
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
                        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">{children}</main>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
