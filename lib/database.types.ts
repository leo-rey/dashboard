// Tipos mínimos hand-written (sem `supabase gen types` — sem credenciais no CI).
// Regenere via `supabase gen types typescript --project-id <id>` quando houver acesso.
export type MemberRole = "admin" | "manager" | "sales" | "viewer";
export type EvidenceLevel = "confirmed" | "inferred" | "pending_validation" | "conflicting";

export interface AccountRow {
  id: string;
  canonical_name: string;
}
export interface ContactRow {
  id: string;
  name: string;
  role_title: string | null;
  status_raw: string | null;
  linkedin_url: string | null;
  last_contact_at: string | null;
  owner_name: string | null;
  account: { id: string; canonical_name: string } | null;
}
export interface ActivityRow {
  id: string;
  effective_on: string;
  contacts_count: number;
  invites_count: number;
  messages_count: number;
  replies_count: number;
  conversations_count: number;
  meetings_count: number;
  opportunities_count: number;
  owner_name: string | null;
  channel: { name: string } | null;
}
export interface OpportunityRow {
  id: string;
  title: string;
  value_amount: number | string;
  probability: number;
  expected_close_on: string | null;
  next_action: string | null;
  next_action_due_on: string | null;
  owner_name: string | null;
  account: { id: string; canonical_name: string } | null;
  stage: { name: string; is_closed: boolean } | null;
}

export type HomologationStatus =
  | "a_validar"
  | "pre_cadastro"
  | "email_compras"
  | "reuniao_compras"
  | "em_homologacao"
  | "homologada"
  | "bloqueada"
  | "sem_avanco";

export interface HomologationRow {
  id: string;
  company_name: string;
  status: HomologationStatus;
  owner_name: string | null;
  supplier_portal_url: string | null;
  buyer_area_contact: string | null;
  last_action: string | null;
  last_action_at: string | null;
  next_action: string | null;
  next_action_due_on: string | null;
  notes: string | null;
  evidence_level: EvidenceLevel;
  updated_at: string;
  account: { id: string; canonical_name: string } | null;
}
