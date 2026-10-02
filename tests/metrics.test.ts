import { describe, expect, it } from "vitest";
import { pipelineMetrics, sumActivities } from "../lib/metrics";
import { neutralizeCsv } from "../lib/validation";

describe("commercial metrics", () => {
  it("sums aggregate activity without inventing atomic events", () => {
    expect(sumActivities([{ contacts: 10, invites: 8, messages: 2, replies: 1, conversations: 1, meetings: 0, opportunities: 0 }]).contacts).toBe(10);
  });
  it("calculates weighted open pipeline", () => {
    expect(pipelineMetrics([{ value_amount: 1000, probability: 50, stage: { is_closed: false } }]).weighted).toBe(500);
  });
  it("neutralizes spreadsheet formulas", () => { expect(neutralizeCsv("=1+1")).toBe("'=1+1"); });
});
