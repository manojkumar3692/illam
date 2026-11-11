import { requireAdmin, auditAdmin } from "@/lib/admin";
import { sameOrigin, failure } from "@/lib/server";
import { recordEvent } from "@/lib/telemetry";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    await auditAdmin("monitor.test");
    const id = await recordEvent("test", "MONITOR_TEST", "/admin");
    return Response.json({ id }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e, "/api/admin");
  }
}
