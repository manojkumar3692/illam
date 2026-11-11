import { z } from "zod";
import { getAuth } from "@/lib/auth/server";
import { sameOrigin, failure, HttpError } from "@/lib/server";
import { recordEvent } from "@/lib/telemetry";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const { data } = await getAuth().getSession();
    if (!data?.user) throw new HttpError(401, "Sign in required.");
    if (Number(req.headers.get("content-length") || 0) > 1024)
      throw new HttpError(413, "Request too large.");
    const body = z
      .object({
        code: z.enum([
          "CLIENT_EXCEPTION",
          "CLIENT_REJECTION",
          "CLIENT_RENDER",
          "NETWORK_ERROR",
          "HTTP_ERROR",
        ]),
        route: z.string().max(150),
        status: z.number().int().min(400).max(599).optional(),
      })
      .strict()
      .parse(await req.json());
    await recordEvent(
      "browser",
      body.code,
      body.route,
      body.status || null,
      data.user.id,
    );
    return new Response(null, { status: 204 });
  } catch (e) {
    return failure(e, "/api/events");
  }
}
