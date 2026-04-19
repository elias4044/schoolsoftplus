import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SchoolSoft+",
    short_name: "SSP+",
    description: "A fast, modern dashboard for your SchoolSoft account.",
    start_url: "/",
    display: "standalone",
    background_color: "#191919",
    theme_color: "#0f0f14",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
