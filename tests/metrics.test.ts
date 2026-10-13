import { describe, expect, it } from "vitest";
import { activityTrend, formatCommercialDate, formatCommercialDateTime, funnelMetrics, pipelineByStage, pipelineMetrics, priorityOpportunities, sumActivities } from "../lib/metrics";
import { neutralizeCsv } from "../lib/validation";

describe("commercial metrics", () => {
  it("sums aggregate activity without inventing atomic events", () => {
    expect(sumActivities([{ contacts: 10, invites: 8, messages: 2, replies: 1, conversations: 1, meetings: 0, opportunities: 0 }]).contacts).toBe(10);
  });
  it("calculates weighted open pipeline", () => {
    expect(pipelineMetrics([{ value_amount: 1000, probability: 50, stage: { is_closed: false } }]).weighted).toBe(500);
  });
  it("neutralizes spreadsheet formulas", () => { expect(neutralizeCsv("=1+1")).toBe("'=1+1"); });
  it("formats date-only and timestamp values without crashing", () => {
    expect(formatCommercialDate("2026-10-02")).toBe("02/10/2026");
    expect(formatCommercialDate("2026-10-02T00:00:00.000Z")).toBe("01/10/2026");
    expect(formatCommercialDate(new Date("2026-10-02T18:00:28.000Z"))).toBe("02/10/2026");
  });
  it("shows a placeholder for missing or invalid dates", () => {
    expect(formatCommercialDate("Data a validar")).toBe("—");
    expect(formatCommercialDateTime(undefined)).toBe("—");
  });
  it("ignores closed stages and NaN amounts", () => {
    const r = pipelineMetrics([
      { value_amount: "invalid", probability: 50, stage: { is_closed: false } },
      { value_amount: 1000, probability: NaN as unknown as number, stage: { is_closed: false } },
      { value_amount: 2000, probability: 50, stage: { is_closed: true } },
    ]);
    expect(r.count).toBe(2);
    expect(r.total).toBe(1000);
    expect(r.weighted).toBe(0);
  });
  it("hardens activity sums against NaN and negatives", () => {
    const totals = sumActivities([{ contacts: NaN, invites: -5, messages: 2.9, replies: 1, conversations: 1, meetings: 0, opportunities: 0 } as unknown as Parameters<typeof sumActivities>[0][number]]);
    expect(totals.contacts).toBe(0);
    expect(totals.invites).toBe(0);
    expect(totals.messages).toBe(2);
  });
  it("computes funnel conversion rates safely", () => {
    expect(funnelMetrics({ invites: 100, replies: 20, conversations: 10, meetings: 5, opportunities: 1 })).toMatchObject({
      replyRate: 20, conversationRate: 50, meetingRate: 50, opportunityRate: 20,
    });
    expect(funnelMetrics({ invites: 0, replies: 0, conversations: 0, meetings: 0, opportunities: 0 }).replyRate).toBe(0);
  });
  it("buckets open pipeline by stage", () => {
    const buckets = pipelineByStage([
      { value_amount: 1000, probability: 50, stage: { name: "Qualificada", is_closed: false } },
      { value_amount: 2000, probability: 100, stage: { name: "Qualificada", is_closed: false } },
      { value_amount: 500, probability: 10, stage: { name: "Ganha", is_closed: true } },
    ]);
    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({ name: "Qualificada", count: 2, total: 3000, weighted: 2500 });
  });
  it("builds a chronological activity trend", () => {
    const trend = activityTrend([
      { effective_on: "2026-10-02", invites_count: 5, replies_count: 1, conversations_count: 1, meetings_count: 0 },
      { effective_on: "2026-10-01", invites_count: 3, replies_count: 0, conversations_count: 0, meetings_count: 1 },
      { effective_on: "invalida", invites_count: 99, replies_count: 99, conversations_count: 99, meetings_count: 99 },
    ]);
    expect(trend).toHaveLength(2);
    expect(trend[0].date).toBe("2026-10-01");
    expect(trend[1].invites).toBe(5);
  });
  it("prioritizes overdue opportunities first", () => {
    const items = priorityOpportunities([
      { id: "1", title: "A", next_action: "Ligar", next_action_due_on: "2026-09-01", expected_close_on: null, account: { canonical_name: "Acme" }, stage: { is_closed: false } },
      { id: "2", title: "B", next_action: "Enviar proposta", next_action_due_on: "2026-12-31", expected_close_on: null, account: null, stage: { is_closed: false } },
      { id: "3", title: "Fechada", next_action: "Nada", next_action_due_on: "2026-01-01", expected_close_on: null, account: null, stage: { is_closed: true } },
    ], new Date("2026-10-13T12:00:00Z"));
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe("1");
    expect(items[0].overdue).toBe(true);
  });
});
