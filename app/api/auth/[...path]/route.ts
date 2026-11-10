import { getAuth } from "@/lib/auth/server";
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
const handler =
  (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE") =>
  async (
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
  ) => {
    if (!process.env.NEON_AUTH_BASE_URL)
      return Response.json(
        { error: "Authentication is not configured" },
        { status: 503 },
      );
    return getAuth().handler()[method](request, context);
  };
export const GET = handler("GET");
export const POST = handler("POST");
export const PUT = handler("PUT");
export const PATCH = handler("PATCH");
export const DELETE = handler("DELETE");
