export const eventCodes = [
  "SERVER_ERROR",
  "AUTH_REJECTED",
  "AUTH_ERROR",
  "CLIENT_EXCEPTION",
  "CLIENT_REJECTION",
  "CLIENT_RENDER",
  "NETWORK_ERROR",
  "HTTP_ERROR",
  "MONITOR_TEST",
] as const;
export function safeRoute(value: string) {
  const path = value.split(/[?#]/)[0];
  if (path.startsWith("/api/auth/")) return "/api/auth";
  if (path.startsWith("/api/admin/")) return "/api/admin";
  if (path.startsWith("/api/files/")) return "/api/files/:id";
  if (
    [
      "/",
      "/app",
      "/shop",
      "/admin",
      "/api/projects",
      "/api/team",
      "/api/materials",
      "/api/members",
      "/api/messages",
      "/api/files",
      "/api/session",
    ].includes(path)
  )
    return path;
  return "other";
}
