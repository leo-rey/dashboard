-- Hardening P0/P1: índices para queries do dashboard + updated_at automático + bootstrap profiles.
-- Baseado em supabase-postgres-best-practices (435K installs, oficial Supabase).

-- 1) Índices para ORDER BY do app/page.tsx (evita seq scan em 500/200/1000 linhas)
create index if not exists contacts_updated_idx on public.contacts(organization_id, updated_at desc) where deleted_at is null;
create index if not exists opportunities_updated_idx on public.opportunities(organization_id, updated_at desc) where deleted_at is null;
create index if not exists accounts_name_idx on public.accounts(organization_id, canonical_name) where deleted_at is null;
create index if not exists contacts_last_contact_idx on public.contacts(organization_id, last_contact_at desc) where deleted_at is null;

-- 2) updated_at automático (hoje depende do app)
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_accounts_touch on public.accounts;
create trigger trg_accounts_touch before update on public.accounts
for each row execute function public.touch_updated_at();

drop trigger if exists trg_contacts_touch on public.contacts;
create trigger trg_contacts_touch before update on public.contacts
for each row execute function public.touch_updated_at();

drop trigger if exists trg_opportunities_touch on public.opportunities;
create trigger trg_opportunities_touch before update on public.opportunities
for each row execute function public.touch_updated_at();

-- 3) Bootstrap profiles: cria profile no signup (corrige RLS sem INSERT em profiles).
-- Requer service_role para criar trigger em auth.users — aplicar em ambiente controlado.
-- Descomente se o projeto usa signup via Supabase Auth:
-- create or replace function public.handle_new_user() returns trigger
-- language plpgsql security definer set search_path = '' as $$
-- begin
--   insert into public.profiles(id, display_name)
--   values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
--   on conflict (id) do nothing;
--   return new;
-- end $$;
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created after insert on auth.users
-- for each row execute function public.handle_new_user();
