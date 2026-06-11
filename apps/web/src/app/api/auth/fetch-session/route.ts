import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    
    // Parse cookies manually to ensure we find it regardless of Secure prefix
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map(c => {
        const [key, ...v] = c.split("=");
        return [key, v.join("=")];
      }).filter(c => c[0])
    );

    const token = cookies["__Secure-better-auth.session_token"] || cookies["better-auth.session_token"];

    if (!token) {
      return NextResponse.json({ error: "No session token found in cookies" }, { status: 401 });
    }

    const session = await prisma.session.findFirst({
      where: { token },
      include: { user: true }
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    return NextResponse.json({
      session: {
        token: session.token,
        id: session.id
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      }
    });

  } catch (error: any) {
    console.error("Custom Session Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
