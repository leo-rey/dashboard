import { z } from "zod";

export const evidenceLevel = z.enum(["confirmed", "inferred", "pending_validation", "conflicting"]);

export const activitySchema = z.object({
  idempotencyKey: z.string().min(12).max(120),
  occurredOn: z.iso.date(),
  channelId: z.uuid().nullable().optional(),
  contacts: z.coerce.number().int().min(0).max(100000),
  invites: z.coerce.number().int().min(0).max(100000),
  messages: z.coerce.number().int().min(0).max(100000),
  replies: z.coerce.number().int().min(0).max(100000),
  conversations: z.coerce.number().int().min(0).max(100000),
  meetings: z.coerce.number().int().min(0).max(100000),
  opportunities: z.coerce.number().int().min(0).max(100000),
  note: z.string().trim().max(2000).optional().default(""),
  evidenceLevel: evidenceLevel.default("confirmed")
});

export const opportunitySchema = z.object({
  idempotencyKey: z.string().min(12).max(120),
  accountId: z.uuid(),
  title: z.string().trim().min(3).max(200),
  ownerId: z.uuid().nullable().optional(),
  stageId: z.uuid().nullable().optional(),
  value: z.coerce.number().min(0).max(999999999999),
  probability: z.coerce.number().int().min(0).max(100),
  expectedCloseOn: z.iso.date().nullable().optional(),
  problem: z.string().trim().min(3).max(3000),
  nextAction: z.string().trim().min(3).max(1000),
  nextActionDueOn: z.iso.date().nullable().optional(),
  evidenceLevel: evidenceLevel.default("confirmed")
});

export function neutralizeCsv(value: unknown): string {
  const raw = String(value ?? "");
  return /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
}

