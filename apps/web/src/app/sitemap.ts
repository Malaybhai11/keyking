import type { MetadataRoute } from "next";

const baseUrl = "https://keyking.ledgion.in";
const lastModified = new Date("2026-08-17");

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    ["", "daily", 1],
    ["/ai-api-key-manager", "weekly", 0.95],
    ["/security", "monthly", 0.9],
    ["/guides/claude-code", "weekly", 0.9],
    ["/compare/litellm", "monthly", 0.85],
    ["/docs", "weekly", 0.9],
    ["/docs/pro", "weekly", 0.8],
    ["/docs/pro/tutorial-sdk", "weekly", 0.8],
    ["/use-cases", "weekly", 0.85],
    ["/download", "weekly", 0.8],
  ] as const;

  return pages.map(([path, changeFrequency, priority]) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
