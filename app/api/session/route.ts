import { getAuth } from "@/lib/auth/server";
import { recordEvent } from "@/lib/telemetry";
export const dynamic = "force-dynamic";
export async function GET() {
  const configured =
    !!process.env.DATABASE_URL &&
    !!process.env.NEON_AUTH_BASE_URL &&
    !!process.env.NEON_AUTH_COOKIE_SECRET;
  if (!configured) return Response.json({ configured: false, user: null });
  try {
    const { data } = await getAuth().getSession();
    return Response.json(
      {
        configured: true,
        user: data?.user ? { id: data.user.id, email: data.user.email } : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    await recordEvent("server", "SERVER_ERROR", "/api/session", 503);
    return Response.json(
      { error: "Could not check your session. Please refresh." },
      { status: 503 },
    );
  }
}
