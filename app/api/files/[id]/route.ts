import {
  sql,
  requireUser,
  permission,
  uuid,
  failure,
  HttpError,
} from "@/lib/server";
import { canReadFile } from "@/lib/access";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(),
      id = uuid((await params).id),
      q = sql();
    const [file] =
      await q`select project_id,name,mime,uploader_id from illam_files where id=${id}`;
    if (!file) throw new HttpError(404, "File not found.");
    const access = await permission(file.project_id, user.id);
    const [project] =
      await q`select data from illam_projects where id=${file.project_id}`;
    if (!canReadFile(project.data, access.role, user.id, id, file.uploader_id))
      throw new HttpError(403, "This file is private.");
    const [blob] = await q`select data from illam_files where id=${id}`;
    return new Response(Buffer.from(blob.data, "base64"), {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e, "/api/files/:id");
  }
}
