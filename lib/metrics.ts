export type Activity = { contacts: number; invites: number; messages: number; replies: number; conversations: number; meetings: number; opportunities: number };
export type Opportunity = { value_amount: number | string; probability: number; stage?: { is_closed?: boolean } | null };

const commercialDateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });
const commercialDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "medium"
});

type DateValue = string | number | Date | null | undefined;

function parseDate(value: DateValue) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00-03:00`
    : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatCommercialDate(value: DateValue) {
  const parsed = parseDate(value);
  return parsed ? commercialDateFormatter.format(parsed) : "—";
}

export function formatCommercialDateTime(value: DateValue) {
  const parsed = parseDate(value);
  return parsed ? commercialDateTimeFormatter.format(parsed) : "—";
}

export function sumActivities(rows: Activity[]) {
  return rows.reduce((total, row) => ({
    contacts: total.contacts + row.contacts,
    invites: total.invites + row.invites,
    messages: total.messages + row.messages,
    replies: total.replies + row.replies,
    conversations: total.conversations + row.conversations,
    meetings: total.meetings + row.meetings,
    opportunities: total.opportunities + row.opportunities
  }), { contacts: 0, invites: 0, messages: 0, replies: 0, conversations: 0, meetings: 0, opportunities: 0 });
}

export function pipelineMetrics(rows: Opportunity[]) {
  const open = rows.filter((row) => !row.stage?.is_closed);
  const toSafeAmount = (v: unknown) => {
    const n = Number(v || 0);
    return Number.isFinite(n) ? n : 0;
  };
  const toSafeProb = (p: unknown) => {
    const n = Number(p);
    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, n));
  };
  return {
    count: open.length,
    total: open.reduce((sum, row) => sum + toSafeAmount(row.value_amount), 0),
    weighted: open.reduce((sum, row) => sum + toSafeAmount(row.value_amount) * toSafeProb(row.probability) / 100, 0)
  };
}
