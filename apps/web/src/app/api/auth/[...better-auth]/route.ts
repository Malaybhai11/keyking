import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);
export async function GET(req: Request) {
  const res = await handler.GET(req);
  if (res.status === 500) {
    const text = await res.clone().text();
    return new Response(JSON.stringify({ error: "BetterAuth 500", body: text }), { status: 500 });
  }
  return res;
}
export async function POST(req: Request) {
  const res = await handler.POST(req);
  if (res.status === 500) {
    const text = await res.clone().text();
    return new Response(JSON.stringify({ error: "BetterAuth 500", body: text }), { status: 500 });
  }
  return res;
}
