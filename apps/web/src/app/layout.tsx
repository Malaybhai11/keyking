import type { Metadata } from "next";
import { Space_Grotesk, Lexend } from "next/font/google";
import SiteDirectory from "@/components/SiteDirectory";
import "./globals.css";

const siteUrl = "https://keyking.ledgion.in";

const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "KeyKing AI — Local AI API Key Manager & Gateway", template: "%s | KeyKing AI" },
  description: "KeyKing AI is the local AI gateway for developers. Store AI provider keys in an encrypted local vault, use one OpenAI-compatible endpoint, and automatically fail over across providers.",
  applicationName: "KeyKing AI",
  authors: [{ name: "Ledgion", url: "https://ledgion.in" }],
  creator: "Ledgion",
  publisher: "Ledgion",
  category: "Developer Tools",
  keywords: ["KeyKing AI", "local AI gateway", "AI API key manager", "AI API key vault", "OpenAI compatible gateway", "LLM provider fallback", "multi provider AI gateway", "BYOK AI gateway", "Claude Code gateway", "secure AI API key storage"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "KeyKing AI — Your Local AI Gateway",
    description: "Keep AI API keys encrypted on your machine, call one OpenAI-compatible endpoint, and fail over between providers automatically.",
    type: "website",
    url: siteUrl,
    siteName: "KeyKing AI",
    locale: "en_US",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "KeyKing AI local gateway and encrypted API key vault" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KeyKing AI — Local AI API Key Manager & Gateway",
    description: "Your AI keys. One local endpoint. Automatic provider fallback.",
    creator: "@MalayRaval11",
    images: ["/opengraph-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
};

import { PHProvider } from "./providers";
import PostHogPageView from "./PostHogPageView";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Ledgion",
        url: "https://ledgion.in",
        sameAs: ["https://github.com/Malaybhai11"],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "KeyKing AI",
        alternateName: ["KeyKing AI Gateway", "KeyKing API Key Manager"],
        description: "Official website for KeyKing AI, the local AI API key manager and multi-provider gateway for developers.",
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-US",
        hasPart: [
          { "@type": "WebPage", name: "AI API Key Manager", url: `${siteUrl}/ai-api-key-manager` },
          { "@type": "WebPage", name: "KeyKing AI Security Model", url: `${siteUrl}/security` },
          { "@type": "WebPage", name: "Claude Code Guide", url: `${siteUrl}/guides/claude-code` },
          { "@type": "WebPage", name: "KeyKing AI vs LiteLLM", url: `${siteUrl}/compare/litellm` },
          { "@type": "WebPage", name: "KeyKing AI Documentation", url: `${siteUrl}/docs` },
          { "@type": "WebPage", name: "Download KeyKing AI", url: `${siteUrl}/download` },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${siteUrl}/#primary-navigation`,
        name: "KeyKing AI primary pages",
        itemListElement: [
          ["AI API Key Manager", `${siteUrl}/ai-api-key-manager`],
          ["Security Model", `${siteUrl}/security`],
          ["Claude Code Guide", `${siteUrl}/guides/claude-code`],
          ["KeyKing vs LiteLLM", `${siteUrl}/compare/litellm`],
          ["Documentation", `${siteUrl}/docs`],
          ["Download", `${siteUrl}/download`],
        ].map(([name, url], index) => ({ "@type": "ListItem", position: index + 1, name, url })),
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: "KeyKing AI",
        alternateName: "KeyKing Local AI Gateway",
        applicationCategory: "DeveloperApplication",
        applicationSubCategory: "AI API Gateway",
        operatingSystem: "Windows, macOS, Linux",
        url: siteUrl,
        downloadUrl: "https://github.com/Malaybhai11/keyking/releases/latest",
        softwareHelp: `${siteUrl}/docs`,
        description: "A local AI gateway that stores provider API keys in an encrypted vault, exposes one OpenAI-compatible endpoint, and performs automatic multi-provider fallback.",
        featureList: ["Encrypted local AI API key vault", "OpenAI-compatible local endpoint", "Automatic provider and model fallback", "Priority Ladder routing", "Claude Code and Codex compatibility", "Serverless TypeScript SDK"],
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@id": `${siteUrl}/#organization` },
        sameAs: ["https://github.com/Malaybhai11/keyking"],
      },
    ],
  };

  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${lexend.variable} h-full antialiased`} suppressHydrationWarning>
      <head><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></head>
      <PHProvider>
        <body className="min-h-full flex flex-col font-body bg-neo-bg text-black overflow-x-hidden" suppressHydrationWarning>
          <PostHogPageView />
          {children}
          <SiteDirectory />
        </body>
      </PHProvider>
    </html>
  );
}
