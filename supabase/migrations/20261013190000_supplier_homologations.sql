create table if not exists public.supplier_homologations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  account_id uuid references public.accounts(id) on delete set null,
  company_name text not null,
  normalized_company_name text not null,
  status text not null default 'a_validar' check (status in (
    'a_validar',
    'pre_cadastro',
    'email_compras',
    'reuniao_compras',
    'em_homologacao',
    'homologada',
    'bloqueada',
    'sem_avanco'
  )),
  owner_name text,
  supplier_portal_url text,
  buyer_area_contact text,
  last_action text,
  last_action_at date,
  next_action text,
  next_action_due_on date,
  notes text,
  source text not null default 'homologation_intake',
  evidence_level public.evidence_level not null default 'pending_validation',
  idempotency_key text not null,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(organization_id,idempotency_key)
);

create index if not exists supplier_homologations_org_status_idx on public.supplier_homologations(organization_id,status) where deleted_at is null;
create index if not exists supplier_homologations_due_idx on public.supplier_homologations(organization_id,next_action_due_on) where deleted_at is null and next_action_due_on is not null;
create index if not exists supplier_homologations_company_idx on public.supplier_homologations(organization_id,normalized_company_name) where deleted_at is null;

alter table public.supplier_homologations enable row level security;
grant select,insert,update on public.supplier_homologations to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'supplier_homologations'
      and policyname = 'supplier_homologations_select'
  ) then
    create policy supplier_homologations_select on public.supplier_homologations
      for select to authenticated
      using(app_private.has_org_access(organization_id));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'supplier_homologations'
      and policyname = 'supplier_homologations_insert'
  ) then
    create policy supplier_homologations_insert on public.supplier_homologations
      for insert to authenticated
      with check(app_private.has_org_access(organization_id,array['admin','manager','sales']::public.member_role[]));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'supplier_homologations'
      and policyname = 'supplier_homologations_update'
  ) then
    create policy supplier_homologations_update on public.supplier_homologations
      for update to authenticated
      using(app_private.has_org_access(organization_id,array['admin','manager','sales']::public.member_role[]))
      with check(app_private.has_org_access(organization_id,array['admin','manager','sales']::public.member_role[]));
  end if;
end
$$;
