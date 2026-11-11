import {
  sql,
  requireUser,
  permission,
  sameOrigin,
  uuid,
  failure,
  HttpError,
} from "@/lib/server";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const user = await requireUser(),
      id = uuid(new URL(req.url).searchParams.get("projectId"));
    await permission(id, user.id, false, true);
    const q = sql();
    const members =
      await q`select user_id as id,email,coalesce(access_role, case when role='editor' then 'contractor' else 'family' end) as role from illam_members where project_id=${id}`;
    return Response.json(
      { members },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e, "/api/members");
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser(),
      body = await req.json(),
      id = uuid(body.projectId),
      email = z.string().email().parse(body.email).trim().toLowerCase(),
      role = z
        .enum(["contractor", "architect", "family", "friend"])
        .parse(body.role);
    await permission(id, user.id, false, true);
    const q = sql();
    const [target] =
      await q`select id from neon_auth."user" where lower(email)=${email} and "emailVerified"=true`;
    if (!target)
      throw new HttpError(
        400,
        "This person must create an ILLAM account first.",
      );
    if (target.id === user.id)
      throw new HttpError(400, "You already own this home.");
    await q`insert into illam_members(project_id,user_id,email,role,access_role) values(${id},${target.id},${email},'viewer',${role}) on conflict(project_id,user_id) do update set role='viewer',access_role=excluded.access_role`;
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e, "/api/members");
  }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser(),
      body = await req.json(),
      id = uuid(body.projectId),
      target = z.string().min(1).max(100).parse(body.userId);
    await permission(id, user.id, false, true);
    const q = sql();
    await q`delete from illam_members where project_id=${id} and user_id=${target}`;
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e, "/api/members");
  }
}
