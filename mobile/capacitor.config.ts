import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.hdash.app",
    appName: "HDASH",
    webDir: "dist",
    android: {
        backgroundColor: "#0a0a0a",
    },
    plugins: {
        // No server — runs fully offline from local assets
    },
};

export default config;
