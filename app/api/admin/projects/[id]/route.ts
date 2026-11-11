import { requireAdmin, auditAdmin } from "@/lib/admin";
import { sql, failure, uuid, HttpError } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const id = uuid((await params).id);
    await auditAdmin("project.read", id);
    const q = sql();
    const [project] =
      await q`select id,name,data,revision,created_at,updated_at from illam_projects where id=${id}`;
    if (!project) throw new HttpError(404, "Project not found.");
    const [members, messages, files] = await Promise.all([
      q`select m.user_id,m.email,m.access_role,u.name from illam_members m left join neon_auth."user" u on u.id::text=m.user_id where project_id=${id}`,
      q`select m.id,m.body,m.created_at,s.email as sender,r.email as recipient from illam_messages m left join neon_auth."user" s on s.id::text=m.sender_id left join neon_auth."user" r on r.id::text=m.recipient_id where project_id=${id} order by created_at desc limit 1000`,
      q`select id,name,mime,size,created_at from illam_files where project_id=${id} order by created_at desc limit 1000`,
    ]);
    return Response.json(
      { project, members, messages, files },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e, "/api/admin");
  }
}
