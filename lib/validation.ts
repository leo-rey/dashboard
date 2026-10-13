import { z } from "zod";

export const evidenceLevel = z.enum(["confirmed", "inferred", "pending_validation", "conflicting"]);

export const homologationStatus = z.enum([
  "a_validar",
  "pre_cadastro",
  "email_compras",
  "reuniao_compras",
  "em_homologacao",
  "homologada",
  "bloqueada",
  "sem_avanco",
]);

export const activitySchema = z.object({
  idempotencyKey: z.string().trim().min(12).max(120),
  occurredOn: z.iso.date(),
  channelId: z.uuid().nullable().optional(),
  contacts: z.coerce.number().int().min(0).max(100000).refine((n) => Number.isFinite(n), { message: "contacts must be finite" }),
  invites: z.coerce.number().int().min(0).max(100000).refine((n) => Number.isFinite(n), { message: "invites must be finite" }),
  messages: z.coerce.number().int().min(0).max(100000).refine((n) => Number.isFinite(n), { message: "messages must be finite" }),
  replies: z.coerce.number().int().min(0).max(100000).refine((n) => Number.isFinite(n), { message: "replies must be finite" }),
  conversations: z.coerce.number().int().min(0).max(100000).refine((n) => Number.isFinite(n), { message: "conversations must be finite" }),
  meetings: z.coerce.number().int().min(0).max(100000).refine((n) => Number.isFinite(n), { message: "meetings must be finite" }),
  opportunities: z.coerce.number().int().min(0).max(100000).refine((n) => Number.isFinite(n), { message: "opportunities must be finite" }),
  note: z.string().trim().max(2000).optional().default(""),
  evidenceLevel: evidenceLevel.default("confirmed")
});

export const opportunitySchema = z.object({
  idempotencyKey: z.string().trim().min(12).max(120),
  accountId: z.uuid(),
  title: z.string().trim().min(3).max(200),
  ownerId: z.uuid().nullable().optional(),
  stageId: z.uuid().nullable().optional(),
  value: z.coerce.number().min(0).max(999999999999).refine((n) => Number.isFinite(n), { message: "value must be finite" }),
  probability: z.coerce.number().int().min(0).max(100).refine((n) => Number.isFinite(n), { message: "probability must be finite" }),
  expectedCloseOn: z.iso.date().nullable().optional(),
  problem: z.string().trim().min(3).max(3000),
  nextAction: z.string().trim().min(3).max(1000),
  nextActionDueOn: z.iso.date().nullable().optional(),
  evidenceLevel: evidenceLevel.default("confirmed")
});

export const homologationSchema = z.object({
  idempotencyKey: z.string().trim().min(12).max(120),
  accountId: z.uuid().nullable().optional(),
  companyName: z.string().trim().min(2).max(220),
  status: homologationStatus.default("a_validar"),
  ownerName: z.string().trim().min(2).max(120).nullable().optional(),
  supplierPortalUrl: z.url().startsWith("https://").max(500).nullable().optional(),
  buyerAreaContact: z.string().trim().max(220).nullable().optional(),
  lastAction: z.string().trim().max(1200).nullable().optional(),
  lastActionAt: z.iso.date().nullable().optional(),
  nextAction: z.string().trim().max(1200).nullable().optional(),
  nextActionDueOn: z.iso.date().nullable().optional(),
  notes: z.string().trim().max(3000).nullable().optional(),
  evidenceLevel: evidenceLevel.default("pending_validation")
});

export function neutralizeCsv(value: unknown): string {
  const raw = String(value ?? "");
  return /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
}

