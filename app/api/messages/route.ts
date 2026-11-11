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
    const access = await permission(id, user.id);
    if (!["owner", "architect", "contractor"].includes(access.role))
      throw new HttpError(
        403,
        "Messages are for the owner and their working team.",
      );
    const q = sql();
    const partners =
      access.role === "owner"
        ? await q`select m.user_id as id,coalesce(u.name,m.email) as name,m.email,coalesce(m.access_role,'contractor') as role from illam_members m left join neon_auth."user" u on u.id::text=m.user_id where m.project_id=${id} and coalesce(m.access_role,case when m.role='editor' then 'contractor' else 'family' end) in ('architect','contractor')`
        : await q`select p.owner_id as id,coalesce(u.name,'Project owner') as name,'owner' as role from illam_projects p left join neon_auth."user" u on u.id::text=p.owner_id where p.id=${id}`;
    const messages =
      await q`select id,sender_id as "senderId",recipient_id as "recipientId",body,created_at as "createdAt" from illam_messages where project_id=${id} and (sender_id=${user.id} or recipient_id=${user.id}) order by created_at,id`;
    return Response.json(
      { partners, messages },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser(),
      body = await req.json(),
      id = uuid(body.projectId);
    const recipient = z.string().min(1).max(100).parse(body.recipientId),
      text = z.string().trim().min(1).max(3000).parse(body.body);
    const access = await permission(id, user.id);
    if (!["owner", "architect", "contractor"].includes(access.role))
      throw new HttpError(403, "You cannot send project messages.");
    const q = sql();
    // Recheck the owner/member pair in the write; clients cannot choose a sender or message another worker.
    const rows =
      await q`insert into illam_messages(project_id,sender_id,recipient_id,body)
      select p.id,${user.id},${recipient},${text} from illam_projects p join illam_members m on m.project_id=p.id
      where p.id=${id} and coalesce(m.access_role,case when m.role='editor' then 'contractor' else 'family' end) in ('architect','contractor')
      and ((p.owner_id=${user.id} and m.user_id=${recipient}) or (p.owner_id=${recipient} and m.user_id=${user.id})) returning id`;
    if (!rows.length)
      throw new HttpError(
        403,
        "This person no longer has messaging access to this project.",
      );
    return Response.json({ id: rows[0].id }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
