import { requireAdmin, auditAdmin } from "@/lib/admin";
import { sql, failure } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    await auditAdmin("dashboard.read");
    const q = sql();
    const [users, projects, events, activity, reads] = await Promise.all([
      q`select u.id,u.name,u.email,u."emailVerified" as verified,u."createdAt" as created_at,(select count(*)::int from illam_projects p where p.owner_id=u.id::text) as owned_projects,(select count(*)::int from illam_members m where m.user_id=u.id::text) as memberships from neon_auth."user" u order by u."createdAt" desc limit 500`,
      q`select p.id,p.name,u.email as owner_email,p.created_at,p.updated_at,p.revision,jsonb_array_length(coalesce(p.data->'transactions','[]')) as transactions,jsonb_array_length(coalesce(p.data->'stages','[]')) as stages,jsonb_array_length(coalesce(p.data->'updates','[]')) as notes,jsonb_array_length(coalesce(p.data->'payments','[]')) as requests from illam_projects p left join neon_auth."user" u on u.id::text=p.owner_id order by p.updated_at desc limit 500`,
      q`select e.id,e.source,e.code,e.route,e.status,e.created_at,u.email from illam_events e left join neon_auth."user" u on u.id::text=e.user_id order by e.created_at desc limit 200`,
      q`select a.id,a.action,a.created_at,p.name as project,u.email from illam_audit a left join illam_projects p on p.id=a.project_id left join neon_auth."user" u on u.id::text=a.user_id order by a.created_at desc limit 200`,
      q`select id,action,target_id,created_at from illam_admin_audit order by created_at desc limit 100`,
    ]);
    return Response.json(
      { users, projects, events, activity, reads },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e, "/api/admin");
  }
}
