import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/stats", "/open-source", "/terms", "/login-help"],
        disallow: [
          "/api/",
          "/dashboard",
          "/schedule",
          "/assignments",
          "/lunch",
          "/news",
          "/notes",
          "/settings",
          "/subjects",
          "/countdown",
          "/shared/",
          "/login",
        ],
      },
    ],
    sitemap: "https://ssp.elias4044.com/sitemap.xml",
  };
}
