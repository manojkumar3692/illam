import { getAuth } from "@/lib/auth/server";
import { recordEvent } from "@/lib/telemetry";
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
    try {
      const response = await getAuth().handler()[method](request, context);
      if (response.status >= 400 && method !== "GET")
        await recordEvent(
          "auth",
          response.status >= 500 ? "AUTH_ERROR" : "AUTH_REJECTED",
          "/api/auth",
          response.status,
        );
      return response;
    } catch {
      const eventId = await recordEvent("auth", "AUTH_ERROR", "/api/auth", 500);
      return Response.json(
        { error: "Authentication is temporarily unavailable.", eventId },
        { status: 500 },
      );
    }
  };
export const GET = handler("GET");
export const POST = handler("POST");
export const PUT = handler("PUT");
export const PATCH = handler("PATCH");
export const DELETE = handler("DELETE");
