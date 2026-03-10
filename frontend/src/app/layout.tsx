import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import { AuthProvider } from "@/lib/auth-context";

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
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
        <html lang="en">
            <body
                className={`${geistMono.variable} bg-neutral-950 text-white font-mono antialiased`}
            >
                <AuthProvider>
                    <NavBar />
                    <main className="p-6">{children}</main>
                </AuthProvider>
            </body>
        </html>
    );
}
