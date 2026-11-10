import {
  sql,
  requireUser,
  permission,
  uuid,
  failure,
  HttpError,
} from "@/lib/server";
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
      await q`select project_id,name,mime from illam_files where id=${id}`;
    if (!file) throw new HttpError(404, "File not found.");
    await permission(file.project_id, user.id);
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
    return failure(e);
  }
}
