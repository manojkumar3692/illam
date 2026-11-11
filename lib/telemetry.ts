import "server-only";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { safeRoute, eventCodes } from "./event-shape";
export async function recordEvent(
  source: "server" | "browser" | "auth" | "test",
  code: (typeof eventCodes)[number],
  route: string,
  status: number | null = null,
  userId: string | null = null,
) {
  const id = randomUUID();
  console.error(
    JSON.stringify({
      eventId: id,
      source,
      code,
      route: safeRoute(route),
      status,
    }),
  );
  if (!process.env.DATABASE_URL) return id;
  try {
    const q = neon(process.env.DATABASE_URL);
    await q`insert into illam_events(id,source,code,route,status,user_id) select ${id},${source},${code},${safeRoute(route)},${status},${userId} where (select count(*) from illam_events where created_at>now()-interval '1 minute' and user_id is not distinct from ${userId})<30 and (select count(*) from illam_events where created_at>now()-interval '1 day')<10000`;
  } catch {
    console.error("ILLAM_MONITOR_STORAGE_UNAVAILABLE");
  }
  return id;
}
