-- Existing ownerless reports deliberately remain without management authority.
alter table public.validations
  add column creator_token_hash text
  check (creator_token_hash is null or creator_token_hash ~ '^[a-f0-9]{64}$');

comment on column public.validations.creator_token_hash is
  'SHA-256 hash of an anonymous creator capability; never included in public reads.';
