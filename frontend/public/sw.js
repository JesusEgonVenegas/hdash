// hdash Web Push service worker.

self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data ? event.data.text() : "" };
    }
    const title = data.title || "hdash";
    const options = {
        body: data.body || "",
        tag: data.url || "hdash",
        data: { url: data.url || "/" },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || "/";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
            for (const c of wins) {
                if (c.url.includes(target) && "focus" in c) return c.focus();
            }
            if (clients.openWindow) return clients.openWindow(target);
        })
    );
});
