create table if not exists public.illam_messages (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.illam_projects(id) on delete cascade,
 sender_id text not null, recipient_id text not null,
 body text not null check(length(body) between 1 and 3000),
 created_at timestamptz not null default now(),
 check(sender_id <> recipient_id)
);
create index if not exists illam_messages_project on public.illam_messages(project_id, created_at);
alter table public.illam_messages enable row level security;
revoke all on public.illam_messages from public;
