create extension if not exists pgcrypto;
create schema if not exists app_private;

create type public.member_role as enum ('admin','manager','sales','viewer');
create type public.evidence_level as enum ('confirmed','inferred','pending_validation','conflicting');
create type public.import_status as enum ('dry_run','pending_approval','promoted','failed','rolled_back');

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict, display_name text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role public.member_role not null default 'viewer', active boolean not null default true,
  created_at timestamptz not null default now(), primary key (organization_id,user_id)
);
create table public.commercial_fronts (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, active boolean not null default true, unique(organization_id,name));
create table public.channels (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, active boolean not null default true, unique(organization_id,name));
create table public.opportunity_stages (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, position smallint not null, is_closed boolean not null default false, is_won boolean not null default false, unique(organization_id,name));

create table public.accounts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), legacy_id text,
  canonical_name text not null, normalized_name text not null, domain text, source text not null default 'manual', evidence_level public.evidence_level not null default 'confirmed',
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create unique index accounts_legacy_uidx on public.accounts(organization_id,legacy_id) where legacy_id is not null;
create unique index accounts_identity_uidx on public.accounts(organization_id,normalized_name,coalesce(domain,'')) where deleted_at is null;

create table public.contacts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), account_id uuid not null references public.accounts(id), legacy_id text,
  front_id uuid references public.commercial_fronts(id), owner_id uuid references public.profiles(id), name text not null, normalized_name text not null, role_title text, channel_id uuid references public.channels(id),
  linkedin_url text, linkedin_canonical text, priority_rank integer, priority_level text, confidence_raw text, status_raw text, approach_rule_raw text,
  last_contact_at timestamptz, next_action text, next_action_due_on date, source text not null, verified_at timestamptz, notes text,
  evidence_level public.evidence_level not null default 'confirmed', created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create unique index contacts_legacy_uidx on public.contacts(organization_id,legacy_id) where legacy_id is not null;
create unique index contacts_linkedin_uidx on public.contacts(organization_id,linkedin_canonical) where linkedin_canonical is not null and deleted_at is null;
create index contacts_account_idx on public.contacts(organization_id,account_id) where deleted_at is null;
create index contacts_owner_idx on public.contacts(organization_id,owner_id) where deleted_at is null;

create table public.activity_batches (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), legacy_id text, owner_id uuid references public.profiles(id), channel_id uuid references public.channels(id),
  effective_on date not null, contacts_count integer not null default 0 check(contacts_count>=0), invites_count integer not null default 0 check(invites_count>=0), messages_count integer not null default 0 check(messages_count>=0),
  replies_count integer not null default 0 check(replies_count>=0), conversations_count integer not null default 0 check(conversations_count>=0), meetings_count integer not null default 0 check(meetings_count>=0), opportunities_count integer not null default 0 check(opportunities_count>=0),
  granularity text not null default 'aggregate' check(granularity in ('aggregate','atomic')), notes text, source text not null, evidence_level public.evidence_level not null default 'confirmed', idempotency_key text not null,
  import_run_id uuid, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), unique(organization_id,idempotency_key)
);
create unique index activity_legacy_uidx on public.activity_batches(organization_id,legacy_id) where legacy_id is not null;
create index activity_date_idx on public.activity_batches(organization_id,effective_on desc);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), account_id uuid not null references public.accounts(id), legacy_id text,
  title text not null, problem text not null, owner_id uuid references public.profiles(id), stage_id uuid references public.opportunity_stages(id), value_amount numeric(14,2) not null default 0 check(value_amount>=0),
  probability smallint not null default 0 check(probability between 0 and 100), expected_close_on date, next_action text not null, next_action_due_on date,
  evidence_level public.evidence_level not null default 'pending_validation', source text not null, idempotency_key text not null,
  created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(organization_id,idempotency_key)
);
create unique index opportunities_legacy_uidx on public.opportunities(organization_id,legacy_id) where legacy_id is not null;
create index opportunities_stage_idx on public.opportunities(organization_id,stage_id) where deleted_at is null;

create table public.opportunity_stage_history (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), opportunity_id uuid not null references public.opportunities(id), from_stage_id uuid references public.opportunity_stages(id), to_stage_id uuid not null references public.opportunity_stages(id), changed_by uuid not null references public.profiles(id), changed_at timestamptz not null default now(), evidence text);
create table public.meetings (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), account_id uuid not null references public.accounts(id), contact_id uuid references public.contacts(id), opportunity_id uuid references public.opportunities(id), owner_id uuid references public.profiles(id), scheduled_at timestamptz not null, held_at timestamptz, status text not null, notes text, evidence_level public.evidence_level not null default 'confirmed', idempotency_key text not null, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), unique(organization_id,idempotency_key));
create table public.commercial_events (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), account_id uuid references public.accounts(id), contact_id uuid references public.contacts(id), opportunity_id uuid references public.opportunities(id), owner_id uuid references public.profiles(id), channel_id uuid references public.channels(id), event_type text not null, occurred_at timestamptz not null, quantity integer not null default 1 check(quantity>0), granularity text not null default 'atomic' check(granularity in ('atomic','aggregate')), evidence_level public.evidence_level not null default 'confirmed', source text not null, evidence text, idempotency_key text not null, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), unique(organization_id,idempotency_key));
create table public.next_actions (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), account_id uuid references public.accounts(id), contact_id uuid references public.contacts(id), opportunity_id uuid references public.opportunities(id), owner_id uuid references public.profiles(id), description text not null, due_on date, status text not null default 'open', created_by uuid references public.profiles(id), created_at timestamptz not null default now(), completed_at timestamptz);

create table public.import_runs (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), source_file text not null, source_hash text not null, importer_version text not null, status public.import_status not null, dry_run boolean not null default true, summary jsonb not null default '{}'::jsonb, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), approved_by uuid references public.profiles(id), approved_at timestamptz, unique(organization_id,source_hash,importer_version,dry_run));
alter table public.activity_batches add constraint activity_import_run_fk foreign key(import_run_id) references public.import_runs(id);
create table public.import_rows (id uuid primary key default gen_random_uuid(), import_run_id uuid not null references public.import_runs(id), source_sheet text not null, source_row integer not null, row_hash text not null, raw_payload jsonb not null, parsed_payload jsonb, result text not null, entity_type text, entity_id uuid, messages jsonb not null default '[]'::jsonb, unique(import_run_id,source_sheet,source_row));
create table public.import_conflicts (id uuid primary key default gen_random_uuid(), import_run_id uuid not null references public.import_runs(id), import_row_id uuid references public.import_rows(id), conflict_type text not null, details jsonb not null, status text not null default 'pending', resolved_by uuid references public.profiles(id), resolved_at timestamptz, created_at timestamptz not null default now());
create table public.audit_log (id bigint generated always as identity primary key, organization_id uuid not null references public.organizations(id), table_name text not null, record_id uuid not null, action text not null, actor_id uuid references public.profiles(id), before_data jsonb, after_data jsonb, source text not null, occurred_at timestamptz not null default now());

create or replace function app_private.has_org_access(target_org uuid, allowed public.member_role[] default array['admin','manager','sales','viewer']::public.member_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.organization_memberships m where m.organization_id=target_org and m.user_id=(select auth.uid()) and m.active and m.role=any(allowed));
$$;
revoke all on function app_private.has_org_access(uuid,public.member_role[]) from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.has_org_access(uuid,public.member_role[]) to authenticated;

do $$ declare t text; begin foreach t in array array['organizations','profiles','organization_memberships','commercial_fronts','channels','opportunity_stages','accounts','contacts','activity_batches','opportunities','opportunity_stage_history','meetings','commercial_events','next_actions','import_runs','import_rows','import_conflicts','audit_log'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
revoke all on all tables in schema public from anon;
grant select,insert,update on public.profiles,public.organization_memberships,public.commercial_fronts,public.channels,public.opportunity_stages,public.accounts,public.contacts,public.activity_batches,public.opportunities,public.opportunity_stage_history,public.meetings,public.commercial_events,public.next_actions,public.import_runs,public.import_rows,public.import_conflicts to authenticated;
grant select on public.organizations,public.audit_log to authenticated;

create policy org_select on public.organizations for select to authenticated using(app_private.has_org_access(id));
create policy profiles_select on public.profiles for select to authenticated using(id=(select auth.uid()) or exists(select 1 from public.organization_memberships mine join public.organization_memberships theirs using(organization_id) where mine.user_id=(select auth.uid()) and mine.active and theirs.user_id=profiles.id and theirs.active));
create policy memberships_select on public.organization_memberships for select to authenticated using(app_private.has_org_access(organization_id));
create policy memberships_admin_write on public.organization_memberships for all to authenticated using(app_private.has_org_access(organization_id,array['admin']::public.member_role[])) with check(app_private.has_org_access(organization_id,array['admin']::public.member_role[]));

do $$ declare t text; begin foreach t in array array['commercial_fronts','channels','opportunity_stages','accounts','contacts','activity_batches','opportunities','opportunity_stage_history','meetings','commercial_events','next_actions'] loop
 execute format('create policy %I on public.%I for select to authenticated using(app_private.has_org_access(organization_id))',t||'_select',t);
 execute format('create policy %I on public.%I for insert to authenticated with check(app_private.has_org_access(organization_id,array[''admin'',''manager'',''sales'']::public.member_role[]))',t||'_insert',t);
 execute format('create policy %I on public.%I for update to authenticated using(app_private.has_org_access(organization_id,array[''admin'',''manager'',''sales'']::public.member_role[])) with check(app_private.has_org_access(organization_id,array[''admin'',''manager'',''sales'']::public.member_role[]))',t||'_update',t);
 end loop; end $$;
create policy import_runs_select on public.import_runs for select to authenticated using(app_private.has_org_access(organization_id,array['admin','manager']::public.member_role[]));
create policy import_runs_write on public.import_runs for all to authenticated using(app_private.has_org_access(organization_id,array['admin']::public.member_role[])) with check(app_private.has_org_access(organization_id,array['admin']::public.member_role[]));
create policy import_rows_select on public.import_rows for select to authenticated using(exists(select 1 from public.import_runs r where r.id=import_run_id and app_private.has_org_access(r.organization_id,array['admin','manager']::public.member_role[])));
create policy import_conflicts_select on public.import_conflicts for select to authenticated using(exists(select 1 from public.import_runs r where r.id=import_run_id and app_private.has_org_access(r.organization_id,array['admin','manager']::public.member_role[])));
create policy audit_select on public.audit_log for select to authenticated using(app_private.has_org_access(organization_id,array['admin','manager']::public.member_role[]));

insert into public.organizations(name,slug) values('Antlia Consultoria e Tecnologia','antlia') on conflict(slug) do nothing;
insert into public.commercial_fronts(organization_id,name) select id,x from public.organizations cross join unnest(array['New Logo','Itaú','Bradesco']) x where slug='antlia' on conflict do nothing;
insert into public.channels(organization_id,name) select id,x from public.organizations cross join unnest(array['LinkedIn','E-mail','Telefone','Teams','WhatsApp','Outro']) x where slug='antlia' on conflict do nothing;
insert into public.opportunity_stages(organization_id,name,position,is_closed,is_won) select o.id,x.name,x.pos,x.closed,x.won from public.organizations o cross join (values('Identificada',1,false,false),('Discovery',2,false,false),('Qualificada',3,false,false),('Proposta',4,false,false),('Negociação',5,false,false),('Ganha',6,true,true),('Perdida',7,true,false)) x(name,pos,closed,won) where o.slug='antlia' on conflict do nothing;
