import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as XLSX from "xlsx";

const source = resolve(process.cwd(), "../Comercial_Antlia_Operacao/Base_Comercial_Unica_Antlia.xlsx");
const output = resolve(process.cwd(), "supabase/migrations/20261002211500_import_reconciled_commercial_data.sql");
const buffer = await readFile(source);
const sha256 = createHash("sha256").update(buffer).digest("hex");
const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
const rows = (sheet: string) => XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1, raw: true, defval: "" }).slice(4).filter((r) => r.some(Boolean));
const text = (v: unknown) => String(v ?? "").trim();
const normalized = (v: unknown) => text(v).normalize("NFKC").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
const iso = (v: unknown, withTime = false) => {
  if (!v) return null;
  const d = v instanceof Date ? v : typeof v === "number" ? new Date(Date.UTC(1899, 11, 30) + v * 86400000) : new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return withTime ? d.toISOString() : d.toISOString().slice(0, 10);
};
const canonicalLinkedin = (v: unknown) => {
  try { const u = new URL(text(v)); if (!u.hostname.endsWith("linkedin.com") || u.pathname.includes("/search/")) return null; return `https://${u.hostname.toLowerCase()}${u.pathname.replace(/\/$/, "")}`; }
  catch { return null; }
};
const priority = (v: unknown) => typeof v === "number" ? { rank: Math.trunc(v), level: null } : /^\d+$/.test(text(v)) ? { rank: Number(v), level: null } : { rank: null, level: text(v) || null };
const blockedIds = new Set(["CT-0012","CT-0101","CT-0148","CT-0201","CT-0203","CT-0257","CT-0258","CT-0277","CT-0314","CT-0339","CT-0340","CT-0341","CT-0355","CT-0356"]);
const contactRows = rows("Contatos");
const accountMap = new Map<string,string>();
for (const row of contactRows) { const name = text(row[2]); if (name && !accountMap.has(normalized(name))) accountMap.set(normalized(name), name); }
const accounts = [...accountMap].map(([normalized_name, canonical_name]) => ({ canonical_name, normalized_name }));
const contacts = contactRows.map((r) => {
  const p = priority(r[8]); const legacy = text(r[0]); const blocked = blockedIds.has(legacy); const originalAction = text(r[13]); const originalDue = iso(r[14]);
  const conflictNote = blocked && (originalAction || originalDue) ? `Conflito resolvido na migração de 02/10/2026: regra de não prospectar prevaleceu. Ação anterior preservada apenas para auditoria: ${originalAction || "sem descrição"}${originalDue ? `; prazo ${originalDue}` : ""}.` : "";
  return { legacy_id: legacy, front: text(r[1]), company: text(r[2]), name: text(r[3]), normalized_name: normalized(r[3]), role_title: text(r[4]) || null, owner_name: text(r[5]) || null, channel: text(r[6]) || null,
    linkedin_url: text(r[7]) || null, linkedin_canonical: canonicalLinkedin(r[7]), priority_rank: p.rank, priority_level: p.level, confidence_raw: text(r[9]) || null, status_raw: text(r[10]) || null,
    approach_rule_raw: text(r[11]) || null, last_contact_at: iso(r[12], true), next_action: blocked ? null : text(r[13]) || null, next_action_due_on: blocked ? null : iso(r[14]), source: text(r[15]) || "Planilha oficial",
    verified_at: iso(r[16], true), notes: [text(r[17]), conflictNote].filter(Boolean).join(" ") || null, evidence_level: text(r[7]) && !canonicalLinkedin(r[7]) ? "pending_validation" : "confirmed" };
});
const activities = rows("Atividades").map((r) => ({ legacy_id: text(r[0]), effective_on: iso(r[1]), owner_name: text(r[2]) || null, channel: text(r[3]) || null,
  contacts_count: Number(r[4] || 0), invites_count: Number(r[5] || 0), messages_count: Number(r[6] || 0), replies_count: Number(r[7] || 0), conversations_count: Number(r[8] || 0), meetings_count: Number(r[9] || 0), opportunities_count: Number(r[10] || 0), notes: text(r[11]) || null }));
const q = (value: unknown) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const sql = `-- Generated from the reconciled official workbook. Do not edit by hand.\n` +
`do $$ declare org uuid; run uuid; begin\nselect id into org from public.organizations where slug='antlia';\n`+
`insert into public.import_runs(organization_id,source_file,source_hash,importer_version,status,dry_run,summary) values(org,'Base_Comercial_Unica_Antlia.xlsx','${sha256}','2026-10-02-v1','promoted',false,'{"contacts":470,"activities":23,"opportunities":0,"conflicts_resolved":16}'::jsonb) on conflict(organization_id,source_hash,importer_version,dry_run) do update set status='promoted',summary=excluded.summary returning id into run;\n`+
`insert into public.accounts(organization_id,canonical_name,normalized_name,source,evidence_level) select org,x.canonical_name,x.normalized_name,'Base_Comercial_Unica_Antlia.xlsx','confirmed' from jsonb_to_recordset(${q(accounts)}) x(canonical_name text,normalized_name text) on conflict(organization_id,normalized_name,coalesce(domain,'')) where deleted_at is null do update set canonical_name=excluded.canonical_name,updated_at=now();\n`+
`insert into public.contacts(organization_id,account_id,legacy_id,front_id,owner_name,name,normalized_name,role_title,channel_id,linkedin_url,linkedin_canonical,priority_rank,priority_level,confidence_raw,status_raw,approach_rule_raw,last_contact_at,next_action,next_action_due_on,source,verified_at,notes,evidence_level) select org,a.id,x.legacy_id,f.id,x.owner_name,x.name,x.normalized_name,x.role_title,ch.id,x.linkedin_url,x.linkedin_canonical,x.priority_rank,x.priority_level,x.confidence_raw,x.status_raw,x.approach_rule_raw,x.last_contact_at,x.next_action,x.next_action_due_on,x.source,x.verified_at,x.notes,x.evidence_level::public.evidence_level from jsonb_to_recordset(${q(contacts)}) x(legacy_id text,front text,company text,name text,normalized_name text,role_title text,owner_name text,channel text,linkedin_url text,linkedin_canonical text,priority_rank integer,priority_level text,confidence_raw text,status_raw text,approach_rule_raw text,last_contact_at timestamptz,next_action text,next_action_due_on date,source text,verified_at timestamptz,notes text,evidence_level text) join public.accounts a on a.organization_id=org and a.normalized_name=lower(trim(x.company)) left join public.commercial_fronts f on f.organization_id=org and f.name=x.front left join public.channels ch on ch.organization_id=org and ch.name=x.channel on conflict(organization_id,legacy_id) where legacy_id is not null do update set account_id=excluded.account_id,front_id=excluded.front_id,owner_name=excluded.owner_name,name=excluded.name,normalized_name=excluded.normalized_name,role_title=excluded.role_title,channel_id=excluded.channel_id,linkedin_url=excluded.linkedin_url,linkedin_canonical=excluded.linkedin_canonical,priority_rank=excluded.priority_rank,priority_level=excluded.priority_level,confidence_raw=excluded.confidence_raw,status_raw=excluded.status_raw,approach_rule_raw=excluded.approach_rule_raw,last_contact_at=excluded.last_contact_at,next_action=excluded.next_action,next_action_due_on=excluded.next_action_due_on,source=excluded.source,verified_at=excluded.verified_at,notes=excluded.notes,evidence_level=excluded.evidence_level,updated_at=now();\n`+
`insert into public.activity_batches(organization_id,legacy_id,owner_name,channel_id,effective_on,contacts_count,invites_count,messages_count,replies_count,conversations_count,meetings_count,opportunities_count,granularity,notes,source,evidence_level,idempotency_key,import_run_id) select org,x.legacy_id,x.owner_name,ch.id,x.effective_on,x.contacts_count,x.invites_count,x.messages_count,x.replies_count,x.conversations_count,x.meetings_count,x.opportunities_count,'aggregate',x.notes,'Base_Comercial_Unica_Antlia.xlsx','confirmed','excel:'||x.legacy_id,run from jsonb_to_recordset(${q(activities)}) x(legacy_id text,effective_on date,owner_name text,channel text,contacts_count integer,invites_count integer,messages_count integer,replies_count integer,conversations_count integer,meetings_count integer,opportunities_count integer,notes text) left join public.channels ch on ch.organization_id=org and ch.name=x.channel on conflict(organization_id,legacy_id) where legacy_id is not null do update set owner_name=excluded.owner_name,channel_id=excluded.channel_id,effective_on=excluded.effective_on,contacts_count=excluded.contacts_count,invites_count=excluded.invites_count,messages_count=excluded.messages_count,replies_count=excluded.replies_count,conversations_count=excluded.conversations_count,meetings_count=excluded.meetings_count,opportunities_count=excluded.opportunities_count,notes=excluded.notes,import_run_id=excluded.import_run_id;\n`+
`insert into public.audit_log(organization_id,table_name,record_id,action,before_data,after_data,source) values(org,'import_runs',run,'promote',null,jsonb_build_object('contacts',470,'activities',23,'opportunities',0,'source_hash','${sha256}'),'migration');\nend $$;\n`;
await writeFile(output, sql);
console.log(JSON.stringify({ output, sha256, accounts: accounts.length, contacts: contacts.length, activities: activities.length }));
