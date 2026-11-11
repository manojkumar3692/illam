import "server-only";
import { neon } from "@neondatabase/serverless";
import { getAuth } from "./auth/server";
import { z } from "zod";
import { recordEvent } from "./telemetry";
export const sql = () => {
  if (!process.env.DATABASE_URL)
    throw new HttpError(503, "Database is not configured");
  return neon(process.env.DATABASE_URL);
};
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireUser() {
  const { data, error } = await getAuth().getSession();
  if (error || !data?.user)
    throw new HttpError(401, "Sign in to access your home.");
  if (!data.user.emailVerified)
    throw new HttpError(403, "Verify your email before opening a project.");
  return data.user;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new HttpError(403, "Request origin is not allowed.");
}
export function uuid(value: unknown) {
  return z.string().uuid().parse(value);
}
export async function permission(
  projectId: string,
  userId: string,
  write = false,
  owner = false,
) {
  const q = sql();
  const rows =
    await q`select p.id, case when p.owner_id=${userId} then 'owner' else coalesce(m.access_role, case when m.role='editor' then 'contractor' else 'family' end) end as role from illam_projects p left join illam_members m on m.project_id=p.id and m.user_id=${userId} where p.id=${projectId} and (p.owner_id=${userId} or m.user_id=${userId})`;
  const r = rows[0];
  if (
    !r ||
    (owner && r.role !== "owner") ||
    (write && !["owner", "contractor", "architect"].includes(r.role))
  )
    throw new HttpError(403, "You do not have access to this action.");
  return r;
}
export async function failure(error: unknown, route = "other") {
  if (error instanceof HttpError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  if (error instanceof z.ZodError)
    return Response.json(
      { error: "Some fields are invalid. " + error.issues[0]?.message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  const eventId = await recordEvent("server", "SERVER_ERROR", route, 500);
  return Response.json(
    {
      error: "Unable to save or load this project. Please try again.",
      eventId,
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
