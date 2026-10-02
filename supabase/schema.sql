create table if not exists public.applications (
  id uuid primary key,
  candidate_code text not null unique,
  current_stage text not null check (
    current_stage in (
      'HR_INTERVIEW',
      'TECHNICAL_INTERVIEW',
      'HR_MANAGER',
      'OFFERED',
      'REJECTED'
    )
  ),
  status text not null check (
    status in ('PENDING', 'OFFER_ISSUED', 'REJECTED')
  ),
  created_at timestamptz not null,
  application jsonb not null,
  evaluation jsonb,
  evaluations jsonb not null default '[]'::jsonb
);

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
