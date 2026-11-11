import { cookies } from "next/headers";
import { z } from "zod";
import { sql, sameOrigin, failure, HttpError } from "@/lib/server";
import {
  ADMIN_COOKIE,
  requireAdmin,
  auditAdmin,
  createAdminSession,
} from "@/lib/admin";
import {
  ADMIN_EMAIL,
  hashToken,
  validAdminPassword,
} from "@/lib/admin-credentials";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  try {
    await requireAdmin();
    return Response.json({ email: ADMIN_EMAIL }, { headers });
  } catch (e) {
    return failure(e, "/api/admin");
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const hash = process.env.ILLAM_ADMIN_PASSWORD_HASH;
    if (!hash) throw new HttpError(503, "Admin login is not configured.");
    if (Number(req.headers.get("content-length") || 0) > 2048)
      throw new HttpError(413, "Request too large.");
    const body = z
      .object({ email: z.string().max(200), password: z.string().max(256) })
      .parse(await req.json());
    const bucket = Math.floor(Date.now() / 900000);
    const allowed =
      await sql()`insert into illam_admin_login_limits(bucket,attempts) values(${bucket},1) on conflict(bucket) do update set attempts=illam_admin_login_limits.attempts+1 where illam_admin_login_limits.attempts<10 returning attempts`;
    if (!allowed.length)
      throw new HttpError(
        429,
        "Too many admin login attempts. Try again in 15 minutes.",
      );
    if (!validAdminPassword(body.email, body.password, hash)) {
      await auditAdmin("login.failed");
      throw new HttpError(401, "Invalid admin email or password.");
    }
    await auditAdmin("login.success");
    await createAdminSession();
    return Response.json({ ok: true }, { headers });
  } catch (e) {
    return failure(e, "/api/admin");
  }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    const jar = await cookies();
    const token = jar.get(ADMIN_COOKIE)?.value;
    if (token) {
      await sql()`delete from illam_admin_sessions where token_hash=${hashToken(token)}`;
    }
    jar.delete(ADMIN_COOKIE);
    return Response.json({ ok: true }, { headers });
  } catch (e) {
    return failure(e, "/api/admin");
  }
}
