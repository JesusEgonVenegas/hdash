/**
 * Haptic feedback via Vibration API.
 * Works in Capacitor WebView on Android; silently no-ops on desktop.
 */

export function hapticLight() {
    try { navigator.vibrate?.(8); } catch { /* noop */ }
}

export function hapticMedium() {
    try { navigator.vibrate?.(20); } catch { /* noop */ }
}

export function hapticSuccess() {
    try { navigator.vibrate?.([10, 30, 10]); } catch { /* noop */ }
}

export function hapticError() {
    try { navigator.vibrate?.([30, 20, 30, 20, 60]); } catch { /* noop */ }
}
