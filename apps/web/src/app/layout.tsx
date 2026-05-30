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
  title: "KeyKing — Zero-Trust LLM API Aggregator",
  description: "AES-256-GCM local encrypted key vault, local drop-in Axum proxy, smart rate-limit routing, and model fallback translation.",
};

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
      <body className="min-h-full flex flex-col font-body bg-neo-bg text-black">
        {children}
      </body>
    </html>
  );
}
