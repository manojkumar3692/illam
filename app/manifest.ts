import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ILLAM — My home build",
    short_name: "ILLAM",
    description:
      "Expenses, payments and daily work for your home construction.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f6f5f1",
    theme_color: "#f6f5f1",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
