import { scryptSync, timingSafeEqual, createHash } from "node:crypto";
export const ADMIN_EMAIL = "admin@illam.com";
export function validAdminPassword(
  email: string,
  password: string,
  encoded: string,
) {
  const [salt, hash] = encoded.split(":");
  if (
    !/^[a-f0-9]{32}$/.test(salt || "") ||
    !/^[a-f0-9]{128}$/.test(hash || "") ||
    password.length > 256
  )
    return false;
  const matches = timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(hash, "hex"),
  );
  return email.trim().toLowerCase() === ADMIN_EMAIL && matches;
}
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
