import {
  sql,
  requireUser,
  permission,
  sameOrigin,
  uuid,
  failure,
  HttpError,
} from "@/lib/server";
import { projectSchema } from "@/lib/validation";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await requireUser(),
      q = sql();
    const projects =
      await q`select p.id,p.name,p.data,p.revision,case when p.owner_id=${user.id} then 'owner' else m.role end as role from illam_projects p left join illam_members m on m.project_id=p.id and m.user_id=${user.id} where p.owner_id=${user.id} or m.user_id=${user.id} order by p.created_at`;
    return Response.json(
      { projects },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser();
    const body = await req.json(),
      data = projectSchema.parse(body.data),
      q = sql();
    const [p] =
      await q`insert into illam_projects(owner_id,name,data) values(${user.id},${data.name},${JSON.stringify(data)}::jsonb) returning id`;
    return Response.json(p, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser();
    const body = await req.json(),
      id = uuid(body.id),
      revision = z.number().int().min(0).parse(body.revision),
      data = projectSchema.parse(body.data);
    await permission(id, user.id, true);
    const q = sql();
    const rows =
      await q`with changed as (update illam_projects p set name=${data.name},data=${JSON.stringify(data)}::jsonb,revision=p.revision+1,updated_at=now() where p.id=${id} and p.revision=${revision} and (p.owner_id=${user.id} or exists(select 1 from illam_members m where m.project_id=p.id and m.user_id=${user.id} and m.role='editor')) returning p.id,p.revision), audited as (insert into illam_audit(project_id,user_id,action,revision) select id,${user.id},'project.updated',revision from changed) select revision from changed`;
    if (!rows.length)
      throw new HttpError(
        409,
        "This project changed in another session. Refresh, then try your change again.",
      );
    return Response.json(rows[0]);
  } catch (e) {
    return failure(e);
  }
}
