import {
  sql,
  requireUser,
  permission,
  sameOrigin,
  uuid,
  failure,
  HttpError,
} from "@/lib/server";
import { applyTeamAction, actionSchema } from "@/lib/team";
import { projectSchema } from "@/lib/validation";
import { canSubmit } from "@/lib/access";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser();
    const body = await req.json();
    const id = uuid(body.projectId);
    const revision = z.number().int().min(0).parse(body.revision);
    const access = await permission(id, user.id);
    if (!canSubmit(access.role))
      throw new HttpError(
        403,
        "Only contractors and architects can submit this action.",
      );
    const action = actionSchema.parse(body.entry);
    const q = sql();
    const [current] =
      await q`select data,revision from illam_projects where id=${id}`;
    if (current.revision !== revision)
      throw new HttpError(
        409,
        "Your project has changed. Refresh before submitting again.",
      );
    if (action.action === "request" && action.fileId) {
      const [file] =
        await q`select id from illam_files where id=${action.fileId} and project_id=${id} and uploader_id=${user.id}`;
      if (!file)
        throw new HttpError(403, "Choose a bill you uploaded to this project.");
    }
    let next;
    try {
      next = projectSchema.parse(
        applyTeamAction(
          current.data,
          access.role,
          { id: user.id, name: user.name || user.email },
          action,
        ),
      );
    } catch (e) {
      throw new HttpError(
        400,
        e instanceof Error ? e.message : "Invalid submission.",
      );
    }
    const rows =
      await q`with changed as (update illam_projects p set data=${JSON.stringify(next)}::jsonb,revision=p.revision+1,updated_at=now() where p.id=${id} and p.revision=${revision} and exists(select 1 from illam_members m where m.project_id=p.id and m.user_id=${user.id} and coalesce(m.access_role,case when m.role='editor' then 'contractor' else 'family' end) in ('contractor','architect')) returning p.id,p.revision), audited as (insert into illam_audit(project_id,user_id,action,revision) select id,${user.id},${"team." + action.action},revision from changed) select revision from changed`;
    if (!rows.length)
      throw new HttpError(
        409,
        "Your project or access changed. Refresh and try again.",
      );
    return Response.json(rows[0]);
  } catch (e) {
    return failure(e);
  }
}
