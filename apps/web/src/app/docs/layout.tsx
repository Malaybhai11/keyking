import { Metadata } from "next";

export const metadata: Metadata = {
  title: "KeyKing Documentation | AI Proxy & SDK Docs",
  description: "Official documentation for KeyKing. Learn how to configure the Desktop Proxy, Serverless SDK, and Priority Routing Rules to run Free Claude Code.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
