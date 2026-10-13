import "server-only";
import { getSql } from "@/lib/db";
import type { AccountRow, ActivityRow, ContactRow, OpportunityRow } from "@/lib/database.types";

export interface DashboardData {
  contacts: ContactRow[];
  activities: ActivityRow[];
  opportunities: OpportunityRow[];
  accounts: AccountRow[];
  error: string | null;
  updatedAt: string;
}

const EMPTY: DashboardData = {
  contacts: [],
  activities: [],
  opportunities: [],
  accounts: [],
  error: null,
  updatedAt: new Date().toISOString(),
};

export async function getDashboardData(orgSlug = process.env.ORGANIZATION_SLUG ?? "antlia"): Promise<DashboardData> {
  try {
    const sql = getSql();
    // 1 query para resolver org — evita 4 subselects repetidos (N+1 lógico).
    const orgRows = await sql`select id from public.organizations where slug=${orgSlug} limit 1`;
    const orgId = (orgRows[0] as { id?: string } | undefined)?.id;
    if (!orgId) {
      return { ...EMPTY, error: `Organização "${orgSlug}" não encontrada.`, updatedAt: new Date().toISOString() };
    }
    const [contacts, activities, opportunities, accounts] = await Promise.all([
      sql`select c.id,c.name,c.role_title,c.status_raw,c.linkedin_url,c.last_contact_at,c.owner_name,jsonb_build_object('id',a.id,'canonical_name',a.canonical_name) account from public.contacts c join public.accounts a on a.id=c.account_id where c.deleted_at is null and c.organization_id=${orgId} order by c.updated_at desc limit 500`,
      sql`select b.id,b.effective_on,b.contacts_count,b.invites_count,b.messages_count,b.replies_count,b.conversations_count,b.meetings_count,b.opportunities_count,b.owner_name,jsonb_build_object('name',coalesce(ch.name,'—')) channel from public.activity_batches b left join public.channels ch on ch.id=b.channel_id where b.organization_id=${orgId} order by b.effective_on desc limit 200`,
      sql`select o.id,o.title,o.value_amount,o.probability,o.expected_close_on,o.next_action,o.next_action_due_on,o.owner_name,jsonb_build_object('id',a.id,'canonical_name',a.canonical_name) account,jsonb_build_object('name',coalesce(s.name,'A validar'),'is_closed',coalesce(s.is_closed,false)) stage from public.opportunities o join public.accounts a on a.id=o.account_id left join public.opportunity_stages s on s.id=o.stage_id where o.deleted_at is null and o.organization_id=${orgId} order by o.updated_at desc limit 200`,
      sql`select id,canonical_name from public.accounts where deleted_at is null and organization_id=${orgId} order by canonical_name limit 1000`,
    ]);
    return {
      contacts: contacts as unknown as ContactRow[],
      activities: activities as unknown as ActivityRow[],
      opportunities: opportunities as unknown as OpportunityRow[],
      accounts: accounts as unknown as AccountRow[],
      error: null,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const ref = crypto.randomUUID().slice(0, 8);
    console.error(`[dashboard] db query failed ref=${ref}`, error instanceof Error ? error.message : error);
    return { ...EMPTY, error: `Falha ao consultar o banco (ref ${ref}). Tente novamente.`, updatedAt: new Date().toISOString() };
  }
}
