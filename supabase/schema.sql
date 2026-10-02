alter table public.applications
  add column if not exists candidate_code text,
  add column if not exists current_stage text not null default 'HR_INTERVIEW',
  add column if not exists application jsonb not null default '{}'::jsonb,
  add column if not exists evaluations jsonb not null default '[]'::jsonb;

update public.applications
set candidate_code = 'SGH-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where candidate_code is null;

alter table public.applications
  alter column candidate_code set not null;

create unique index if not exists applications_candidate_code_uidx
  on public.applications (candidate_code);

create index if not exists applications_stage_created_at_idx
  on public.applications (current_stage, created_at desc);

alter table public.applications enable row level security;
revoke all on table public.applications from anon, authenticated;
grant all on table public.applications to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'private-resumes',
  'private-resumes',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
