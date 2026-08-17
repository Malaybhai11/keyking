import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const publicRule = {
    allow: "/",
    disallow: ["/auth/", "/api/", "/billing/"],
  };

  return {
    rules: [
      { userAgent: "*", ...publicRule },
      { userAgent: "GPTBot", ...publicRule },
      { userAgent: "ChatGPT-User", ...publicRule },
      { userAgent: "ClaudeBot", ...publicRule },
      { userAgent: "Claude-User", ...publicRule },
      { userAgent: "PerplexityBot", ...publicRule },
    ],
    sitemap: "https://keyking.ledgion.in/sitemap.xml",
    host: "https://keyking.ledgion.in",
  };
}
