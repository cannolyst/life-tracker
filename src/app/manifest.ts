import type { MetadataRoute } from "next";

// Lets the app be added to the iPhone Home Screen and open full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life Tracker",
    short_name: "Life Tracker",
    description: "Points, habits, plans and a calm look at your day",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5dee7",
    theme_color: "#f5dee7",
    icons: [
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
