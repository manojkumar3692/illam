import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { sql, HttpError } from "./server";
import { hashToken } from "./admin-credentials";
export const ADMIN_COOKIE = "illam-admin-session";
export function adminVersion() {
  const hash = process.env.ILLAM_ADMIN_PASSWORD_HASH;
  if (!hash) throw new HttpError(503, "Admin login is not configured.");
  return hashToken(hash);
}
export async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(401, "Admin sign-in required.");
  const rows =
    await sql()`select token_hash from illam_admin_sessions where token_hash=${hashToken(token)} and credential_version=${adminVersion()} and expires_at>now()`;
  if (!rows.length)
    throw new HttpError(401, "Admin session expired. Sign in again.");
}
export async function auditAdmin(action: string, target: string | null = null) {
  await sql()`insert into illam_admin_audit(action,target_id) values(${action},${target})`;
}
export async function createAdminSession() {
  const token = randomBytes(32).toString("hex");
  await sql()`insert into illam_admin_sessions(token_hash,credential_version,expires_at) values(${hashToken(token)},${adminVersion()},now()+interval '4 hours')`;
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 14400,
  });
}
