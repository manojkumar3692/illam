import {
  sql,
  requireUser,
  permission,
  sameOrigin,
  uuid,
  failure,
  HttpError,
} from "@/lib/server";
import { applyMaterialAction, materialActionSchema } from "@/lib/materials";
import { projectSchema } from "@/lib/validation";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser(),
      body = await req.json(),
      id = uuid(body.projectId),
      revision = z.number().int().min(0).parse(body.revision);
    const access = await permission(id, user.id);
    if (!["owner", "architect", "contractor"].includes(access.role))
      throw new HttpError(403, "Your role cannot manage materials.");
    const action = materialActionSchema.parse(body.entry),
      q = sql();
    const [current] =
      await q`select data,revision from illam_projects where id=${id}`;
    if (current.revision !== revision)
      throw new HttpError(409, "Project changed. Refresh and try again.");
    if (
      (action.action === "movement" || action.action === "request") &&
      action.fileId
    ) {
      const [file] =
        await q`select id from illam_files where id=${action.fileId} and project_id=${id} and (uploader_id=${user.id} or ${access.role}='owner')`;
      if (!file)
        throw new HttpError(403, "Choose a file you uploaded to this project.");
    }
    let next;
    try {
      next = projectSchema.parse(
        applyMaterialAction(
          current.data,
          access.role,
          { id: user.id, name: user.name || user.email },
          action,
        ),
      );
    } catch (e) {
      throw new HttpError(
        400,
        e instanceof Error ? e.message : "Invalid material entry.",
      );
    }
    const rows =
      await q`with changed as (update illam_projects p set data=${JSON.stringify(next)}::jsonb,revision=p.revision+1,updated_at=now() where p.id=${id} and p.revision=${revision} and (p.owner_id=${user.id} or exists(select 1 from illam_members m where m.project_id=p.id and m.user_id=${user.id} and coalesce(m.access_role,case when m.role='editor' then 'contractor' else 'family' end) in ('architect','contractor'))) returning p.id,p.revision), audited as (insert into illam_audit(project_id,user_id,action,revision) select id,${user.id},${"materials." + action.action},revision from changed) select revision from changed`;
    if (!rows.length)
      throw new HttpError(
        409,
        "Your project or access changed. Refresh and try again.",
      );
    return Response.json(rows[0]);
  } catch (e) {
    return failure(e, "/api/materials");
  }
}
