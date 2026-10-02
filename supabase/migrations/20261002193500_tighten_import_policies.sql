drop policy if exists memberships_admin_write on public.organization_memberships;
create policy memberships_admin_insert on public.organization_memberships for insert to authenticated with check(app_private.has_org_access(organization_id,array['admin']::public.member_role[]));
create policy memberships_admin_update on public.organization_memberships for update to authenticated using(app_private.has_org_access(organization_id,array['admin']::public.member_role[])) with check(app_private.has_org_access(organization_id,array['admin']::public.member_role[]));

drop policy if exists import_runs_write on public.import_runs;
create policy import_runs_insert on public.import_runs for insert to authenticated with check(app_private.has_org_access(organization_id,array['admin']::public.member_role[]));
create policy import_runs_update on public.import_runs for update to authenticated using(app_private.has_org_access(organization_id,array['admin']::public.member_role[])) with check(app_private.has_org_access(organization_id,array['admin']::public.member_role[]));

create policy import_rows_insert on public.import_rows for insert to authenticated with check(exists(select 1 from public.import_runs r where r.id=import_run_id and app_private.has_org_access(r.organization_id,array['admin']::public.member_role[])));
create policy import_conflicts_insert on public.import_conflicts for insert to authenticated with check(exists(select 1 from public.import_runs r where r.id=import_run_id and app_private.has_org_access(r.organization_id,array['admin']::public.member_role[])));
create policy import_conflicts_update on public.import_conflicts for update to authenticated using(exists(select 1 from public.import_runs r where r.id=import_run_id and app_private.has_org_access(r.organization_id,array['admin']::public.member_role[]))) with check(exists(select 1 from public.import_runs r where r.id=import_run_id and app_private.has_org_access(r.organization_id,array['admin']::public.member_role[])));

create index if not exists memberships_user_idx on public.organization_memberships(user_id);
create index if not exists activity_owner_idx on public.activity_batches(owner_id);
create index if not exists activity_channel_idx on public.activity_batches(channel_id);
create index if not exists activity_import_idx on public.activity_batches(import_run_id) where import_run_id is not null;
create index if not exists opportunities_account_idx on public.opportunities(account_id) where deleted_at is null;
create index if not exists opportunities_owner_idx on public.opportunities(owner_id) where deleted_at is null;
create index if not exists import_rows_run_idx on public.import_rows(import_run_id);
create index if not exists import_conflicts_run_idx on public.import_conflicts(import_run_id);
