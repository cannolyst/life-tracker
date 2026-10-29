// Life Tracker service worker: shows push notifications and opens the app when
// one is tapped. It does no caching, so the app is always the live one.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Life Tracker", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Life Tracker", {
      body: data.body || "",
      tag: data.tag || "life-tracker",
      icon: "/pwa-icon?size=192",
      badge: "/pwa-icon?size=192",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
