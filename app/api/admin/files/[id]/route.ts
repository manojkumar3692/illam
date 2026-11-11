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
    await auditAdmin("file.download", id);
    const [file] =
      await sql()`select name,mime,data from illam_files where id=${id}`;
    if (!file) throw new HttpError(404, "File not found.");
    return new Response(Buffer.from(file.data, "base64"), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e, "/api/admin");
  }
}
