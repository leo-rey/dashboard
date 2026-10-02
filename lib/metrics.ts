export type Activity = { contacts: number; invites: number; messages: number; replies: number; conversations: number; meetings: number; opportunities: number };
export type Opportunity = { value_amount: number | string; probability: number; stage?: { is_closed?: boolean } | null };

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
  return {
    count: open.length,
    total: open.reduce((sum, row) => sum + Number(row.value_amount || 0), 0),
    weighted: open.reduce((sum, row) => sum + Number(row.value_amount || 0) * row.probability / 100, 0)
  };
}
