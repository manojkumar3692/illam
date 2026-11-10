-- ILLAM v1: private server-only API; all queries enforce owner/member access.
-- Never expose DATABASE_URL to browser code or enable an unauthenticated Data API.
create table if not exists public.illam_projects (
 id uuid primary key default gen_random_uuid(), owner_id text not null,
 name text not null, data jsonb not null, revision integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.illam_members (
 project_id uuid not null references public.illam_projects(id) on delete cascade,
 user_id text not null, email text not null, role text not null check(role in ('editor','viewer')),
 primary key(project_id,user_id)
);
create table if not exists public.illam_files (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.illam_projects(id) on delete cascade,
 name text not null, mime text not null, data text not null, size integer not null check(size between 1 and 3145728),
 created_at timestamptz not null default now()
);
create table if not exists public.illam_audit (
 id bigint generated always as identity primary key,project_id uuid not null references public.illam_projects(id),
 user_id text not null, action text not null, revision integer, created_at timestamptz not null default now()
);
create index if not exists illam_owner on public.illam_projects(owner_id);
create index if not exists illam_member_user on public.illam_members(user_id);
create index if not exists illam_file_project on public.illam_files(project_id);
-- Defense in depth: no public SQL access. The server uses an owner connection.
alter table public.illam_projects enable row level security;
alter table public.illam_members enable row level security;
alter table public.illam_files enable row level security;
alter table public.illam_audit enable row level security;
revoke all on public.illam_projects,public.illam_members,public.illam_files,public.illam_audit from public;
