-- Additive migration. Legacy editor/viewer memberships are restricted by application policy.
alter table public.illam_members add column if not exists access_role text check(access_role in ('contractor','architect','family','friend'));
alter table public.illam_files add column if not exists uploader_id text;
