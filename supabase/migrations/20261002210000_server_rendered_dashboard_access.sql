-- Keeps database credentials server-side while preserving direct dashboard access.
alter table public.contacts add column if not exists owner_name text;
alter table public.activity_batches add column if not exists owner_name text;
alter table public.opportunities add column if not exists owner_name text;

comment on column public.contacts.owner_name is 'Responsável legado preservado da base operacional.';
comment on column public.activity_batches.owner_name is 'Responsável legado preservado da base operacional.';
comment on column public.opportunities.owner_name is 'Responsável legado preservado da base operacional.';
