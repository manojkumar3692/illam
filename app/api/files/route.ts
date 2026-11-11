import {
  sql,
  requireUser,
  permission,
  sameOrigin,
  uuid,
  failure,
  HttpError,
} from "@/lib/server";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser();
    if (Number(req.headers.get("content-length") || 0) > 3300000)
      throw new HttpError(413, "Choose a file smaller than 3 MB.");
    const form = await req.formData(),
      id = uuid(form.get("projectId"));
    await permission(id, user.id, true);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 3145728)
      throw new HttpError(400, "Choose a file between 1 byte and 3 MB.");
    if (
      !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
        file.type,
      )
    )
      throw new HttpError(400, "Use PDF, JPG, PNG or WebP.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const valid =
      file.type === "application/pdf"
        ? bytes.subarray(0, 5).toString() === "%PDF-"
        : file.type === "image/png"
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : file.type === "image/jpeg"
            ? bytes[0] === 255 && bytes[1] === 216
            : bytes.subarray(0, 4).toString() === "RIFF" &&
              bytes.subarray(8, 12).toString() === "WEBP";
    if (!valid)
      throw new HttpError(400, "The file contents do not match its type.");
    const q = sql();
    const [out] =
      await q`insert into illam_files(project_id,name,mime,data,size,uploader_id) values(${id},${file.name.slice(0, 200)},${file.type},${bytes.toString("base64")},${file.size},${user.id}) returning id`;
    return Response.json(out, { status: 201 });
  } catch (e) {
    return failure(e, "/api/files");
  }
}
