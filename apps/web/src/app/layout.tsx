import type { Metadata } from "next";
import { Space_Grotesk, Lexend } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://keyking.ledgion.in'),
  title: "KeyKing | Free Claude Code & Free AI API Aggregator",
  description: "KeyKing is the ultimate Zero-Trust LLM API aggregator. Manage API Keys locally, run Free Claude Code, pool your free tiers, and bypass rate limits with zero limits. Get 1.7 Billion free LLM tokens with KeyKing today.",
  keywords: ["KeyKing", "Free Claude Code", "Free AI API", "Zero-Trust LLM API", "Manage API Keys", "AI aggregator", "vibe coding", "bypass rate limits"],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "KeyKing | Run Claude Code for Free & Manage API Keys",
    description: "Get Free AI API access, manage API keys securely with Zero-Trust encryption, and run Claude Code without limits. KeyKing aggregates LLM free tiers to give you unlimited tokens.",
    type: "website",
    url: "https://keyking.ledgion.in",
    siteName: "KeyKing Ecosystem",
  },
  twitter: {
    card: "summary_large_image",
    title: "KeyKing | Zero-Trust AI API Load Balancer",
    description: "Implement multi-provider redundancy and local failover routing. Manage your API keys locally with zero trust. Ensure 100% uptime for your AI apps.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "e-keyking-verification-id", // Placeholder for actual GSC tag
  }
};

import { PHProvider } from "./providers";
import PostHogPageView from "./PostHogPageView";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "KeyKing AI Proxy",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Windows, macOS, Linux",
        "url": "https://keyking.ledgion.in",
        "description": "KeyKing is the ultimate Zero-Trust LLM API proxy. Manage API Keys locally, implement intelligent fallback routing, and integrate seamlessly with your CLI tools for 100% uptime.",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "publisher": {
          "@type": "Organization",
          "name": "KeyKing Ecosystem",
          "url": "https://keyking.ledgion.in",
          "logo": "https://keyking.ledgion.in/icon.png"
        }
      },
      {
        "@type": "WebSite",
        "url": "https://keyking.ledgion.in",
        "name": "KeyKing Ecosystem",
        "description": "Intelligent AI API Load Balancing and Failover Routing."
      }
    ]
  };

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${lexend.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <PHProvider>
        <body className="min-h-full flex flex-col font-body bg-neo-bg text-black overflow-x-hidden" suppressHydrationWarning>
          <PostHogPageView />
          {children}
        </body>
      </PHProvider>
    </html>
  );
}
