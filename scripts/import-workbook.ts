import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import * as XLSX from "xlsx";

const source = resolve(process.cwd(), "../Comercial_Antlia_Operacao/Base_Comercial_Unica_Antlia.xlsx");
const reportPath = resolve(process.cwd(), "reports/migration-dry-run.json");
const buffer = await readFile(source);
const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
const rows = (sheet: string) => XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheet], { header: 1, raw: false, defval: "" }).slice(4).filter((row) => row.some(Boolean));
const contacts = rows("Contatos");
const activities = rows("Atividades");
const opportunities = rows("Oportunidades").filter((row) => row[1]);
const normalize = (value: unknown) => String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
const linkedin = (value: unknown) => { try { const url = new URL(String(value)); if (!url.hostname.endsWith("linkedin.com") || url.pathname.includes("/search/")) return null; return `${url.hostname}${url.pathname}`.replace(/\/$/, "").toLowerCase(); } catch { return null; } };
const duplicateKeys = (values: (string | null)[]) => [...values.reduce((map, key) => { if (key) map.set(key, (map.get(key) ?? 0) + 1); return map; }, new Map<string,number>())].filter(([, count]) => count > 1).map(([key,count]) => ({ key,count }));
const blockedWithAction = contacts.filter((row) => normalize(row[11]).includes("não prospectar") && (row[13] || row[14])).map((row) => row[0]);
const report = {
  mode: "dry-run", generatedAt: new Date().toISOString(), source, sha256: createHash("sha256").update(buffer).digest("hex"),
  controls: { contacts: contacts.length, activities: activities.length, opportunities: opportunities.length },
  duplicates: {
    legacyContactIds: duplicateKeys(contacts.map((r) => normalize(r[0]))),
    nameCompany: duplicateKeys(contacts.map((r) => `${normalize(r[3])}|${normalize(r[2])}`)),
    canonicalLinkedin: duplicateKeys(contacts.map((r) => linkedin(r[7])))
  },
  conflicts: { blockedWithAction, invalidOrGenericLinkedin: contacts.filter((r) => r[7] && !linkedin(r[7])).map((r) => r[0]) },
  activityTotals: activities.reduce((t, r) => ({ contacts: t.contacts + Number(r[4] || 0), invites: t.invites + Number(r[5] || 0), messages: t.messages + Number(r[6] || 0), replies: t.replies + Number(r[7] || 0), conversations: t.conversations + Number(r[8] || 0), meetings: t.meetings + Number(r[9] || 0), opportunities: t.opportunities + Number(r[10] || 0) }), { contacts:0, invites:0, messages:0, replies:0, conversations:0, meetings:0, opportunities:0 }),
  promotion: "blocked_pending_human_approval"
};
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

