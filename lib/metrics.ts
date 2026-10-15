export type Activity = { contacts: number; invites: number; messages: number; replies: number; conversations: number; meetings: number; opportunities: number };
export type Opportunity = { value_amount: number | string; probability: number; stage?: { is_closed?: boolean } | null };

const INVITE_PENDING_STATUSES = new Set([
  "convite enviado",
  "convite pendente; aguardando aceite",
  "convite enviado; aguardando aceite",
]);

const NEGATIVE_RESPONSE_MARKERS = [
  "sem oportunidade",
  "sem demanda",
  "sem espaço para consultorias",
  "sem aderência",
  "sem interesse",
  "convite rejeitado",
  "execução interna, sem parceiros",
  "não está mais no",
];

function normalizeLabel(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") || "A validar";
}

export function normalizeProspectingStatus(value: string | null | undefined) {
  const status = normalizeLabel(value);
  return INVITE_PENDING_STATUSES.has(status.toLocaleLowerCase("pt-BR"))
    ? "Convite enviado; aguardando aceite"
    : status;
}

export function isNegativeResponse(value: string | null | undefined) {
  const status = normalizeLabel(value).toLocaleLowerCase("pt-BR");
  return NEGATIVE_RESPONSE_MARKERS.some((marker) => status.includes(marker));
}

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
  const toSafeInt = (v: unknown) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.trunc(n));
  };
  return rows.reduce((total, row) => ({
    contacts: total.contacts + toSafeInt(row.contacts),
    invites: total.invites + toSafeInt(row.invites),
    messages: total.messages + toSafeInt(row.messages),
    replies: total.replies + toSafeInt(row.replies),
    conversations: total.conversations + toSafeInt(row.conversations),
    meetings: total.meetings + toSafeInt(row.meetings),
    opportunities: total.opportunities + toSafeInt(row.opportunities)
  }), { contacts: 0, invites: 0, messages: 0, replies: 0, conversations: 0, meetings: 0, opportunities: 0 });
}

export function pipelineMetrics(rows: Opportunity[]) {
  const open = rows.filter((row) => !row.stage?.is_closed);
  const toSafeAmount = (v: unknown) => {
    const n = Number(v || 0);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
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

export type FunnelInput = { invites: number; replies: number; conversations: number; meetings: number; opportunities: number };

function toRate(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  const rate = (Math.max(0, numerator) / denominator) * 100;
  return Math.round(rate * 10) / 10;
}

export function funnelMetrics(t: FunnelInput) {
  const invites = Math.max(0, Math.trunc(Number(t.invites) || 0));
  const replies = Math.max(0, Math.trunc(Number(t.replies) || 0));
  const conversations = Math.max(0, Math.trunc(Number(t.conversations) || 0));
  const meetings = Math.max(0, Math.trunc(Number(t.meetings) || 0));
  const opportunities = Math.max(0, Math.trunc(Number(t.opportunities) || 0));
  return {
    replyRate: toRate(replies, invites),
    conversationRate: toRate(conversations, replies),
    meetingRate: toRate(meetings, conversations),
    opportunityRate: toRate(opportunities, meetings),
  };
}

export type StageBucket = { name: string; count: number; total: number; weighted: number };

export function pipelineByStage(rows: Array<{ value_amount: number | string; probability: number; stage?: { name?: string; is_closed?: boolean } | null }>): StageBucket[] {
  const map = new Map<string, StageBucket>();
  for (const row of rows) {
    if (row.stage?.is_closed) continue;
    const rawName = typeof row.stage?.name === "string" && row.stage.name.trim() ? row.stage.name.trim() : "A validar";
    const amount = Number(row.value_amount);
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    const prob = Number(row.probability);
    const safeProb = Number.isFinite(prob) ? Math.min(100, Math.max(0, prob)) : 0;
    const bucket = map.get(rawName) ?? { name: rawName, count: 0, total: 0, weighted: 0 };
    bucket.count += 1;
    bucket.total += safeAmount;
    bucket.weighted += (safeAmount * safeProb) / 100;
    map.set(rawName, bucket);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export type TrendPoint = { date: string; label: string; invites: number; replies: number; conversations: number; meetings: number };

export function activityTrend(rows: Array<{ effective_on: string | number | Date | null | undefined; invites_count: unknown; replies_count: unknown; conversations_count: unknown; meetings_count: unknown }>, days = 14): TrendPoint[] {
  const safeDays = Number.isFinite(days) ? Math.min(90, Math.max(1, Math.trunc(days))) : 14;
  const byDay = new Map<string, TrendPoint>();
  for (const row of rows) {
    const parsed = parseDate(row.effective_on as DateValue);
    if (!parsed) continue;
    const key = parsed.toISOString().slice(0, 10);
    const toCount = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
    };
    const point = byDay.get(key) ?? {
      date: key,
      label: commercialDateFormatter.format(parsed),
      invites: 0, replies: 0, conversations: 0, meetings: 0,
    };
    point.invites += toCount(row.invites_count);
    point.replies += toCount(row.replies_count);
    point.conversations += toCount(row.conversations_count);
    point.meetings += toCount(row.meetings_count);
    byDay.set(key, point);
  }
  return [...byDay.values()].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-safeDays);
}

export type PriorityOpportunity = {
  id: string;
  accountName: string;
  title: string;
  nextAction: string | null;
  nextActionDueOn: string | null;
  expectedCloseOn: string | null;
  overdue: boolean;
  dueSoon: boolean;
};

export function priorityOpportunities(
  rows: Array<{
    id: unknown; title: unknown; next_action: unknown; next_action_due_on: string | null | undefined;
    expected_close_on: string | null | undefined; account?: { canonical_name?: unknown } | null;
    stage?: { is_closed?: boolean } | null;
  }>,
  now = new Date(),
  limit = 8
): PriorityOpportunity[] {
  const todayKey = now.toISOString().slice(0, 10);
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 7);
  const soonKey = soon.toISOString().slice(0, 10);
  const items: PriorityOpportunity[] = [];
  for (const row of rows) {
    if (row.stage?.is_closed) continue;
    const due = typeof row.next_action_due_on === "string" ? row.next_action_due_on.slice(0, 10) : null;
    const overdue = !!due && due < todayKey;
    const dueSoon = !!due && !overdue && due <= soonKey;
    const accountName = typeof row.account?.canonical_name === "string" && row.account.canonical_name.trim()
      ? row.account.canonical_name : "Conta sem nome";
    items.push({
      id: String(row.id ?? ""),
      accountName,
      title: typeof row.title === "string" ? row.title : "",
      nextAction: typeof row.next_action === "string" ? row.next_action : null,
      nextActionDueOn: typeof row.next_action_due_on === "string" ? row.next_action_due_on : null,
      expectedCloseOn: typeof row.expected_close_on === "string" ? row.expected_close_on : null,
      overdue,
      dueSoon,
    });
  }
  items.sort((a, b) => Number(b.overdue) - Number(a.overdue) || Number(b.dueSoon) - Number(a.dueSoon));
  return items.slice(0, Math.min(50, Math.max(1, limit)));
}
