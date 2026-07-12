create table public.validations (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null unique default gen_random_uuid(),
  report_id text not null unique,
  owner_id uuid references auth.users (id) on delete set null,
  decision text not null check (char_length(decision) between 3 and 280),
  style text not null check (
    style in ('strong', 'cautious', 'external-factors')
  ),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  source text not null check (source in ('openai', 'demo')),
  model text not null check (char_length(model) between 1 and 120),
  prompt_version text not null default 'v1',
  input_hash text not null check (char_length(input_hash) = 64),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  visibility text not null default 'unlisted' check (
    visibility in ('unlisted', 'public')
  ),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  check (visibility = 'public' or published_at is null)
);

create index validations_visibility_created_at_idx
  on public.validations (visibility, created_at desc);

create index validations_owner_created_at_idx
  on public.validations (owner_id, created_at desc)
  where owner_id is not null;

alter table public.validations enable row level security;

revoke all on table public.validations from anon, authenticated;
grant select, insert, update, delete on table public.validations to service_role;

comment on table public.validations is
  'Structured ConfirmationBI reports. Unlisted records are only accessed through server-side routes.';

comment on column public.validations.share_id is
  'High-entropy identifier used in unlisted share URLs.';
