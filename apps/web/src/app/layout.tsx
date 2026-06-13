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
  title: "KeyKing | Free Claude Code & Free AI API Aggregator",
  description: "KeyKing is the ultimate API aggregator to run Free Claude Code and get Free AI API access. Pool your free tiers, bypass rate limits, and vibe-code locally with zero limits. Get 1.7 Billion free LLM tokens with KeyKing today.",
  keywords: ["KeyKing", "free claude code", "free AI API", "claude code", "AI aggregator", "vibe coding", "bypass rate limits"],
  openGraph: {
    title: "KeyKing | Run Claude Code for Free",
    description: "Get Free AI API access and run Claude Code without limits. KeyKing aggregates LLM free tiers to give you unlimited tokens.",
    type: "website",
    url: "https://keyking.ledgion.in",
  },
  twitter: {
    card: "summary_large_image",
    title: "KeyKing | Free Claude Code & AI API",
    description: "Aggregate free AI APIs and run Claude Code for free. Never hit an LLM rate limit again.",
  }
};

import { PHProvider } from "./providers";
import PostHogPageView from "./PostHogPageView";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${lexend.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <PHProvider>
        <body className="min-h-full flex flex-col font-body bg-neo-bg text-black overflow-x-hidden" suppressHydrationWarning>
          <PostHogPageView />
          {children}
        </body>
      </PHProvider>
    </html>
  );
}
