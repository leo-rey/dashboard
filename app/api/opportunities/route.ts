import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { opportunitySchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = opportunitySchema.parse(await request.json());
    const { supabase, user, membership } = await requireMembership();
    const { data, error } = await supabase.from("opportunities").upsert({
      organization_id: membership.organization_id, account_id: body.accountId, title: body.title,
      owner_id: body.ownerId ?? user.id, stage_id: body.stageId ?? null, value_amount: body.value,
      probability: body.probability, expected_close_on: body.expectedCloseOn ?? null, problem: body.problem,
      next_action: body.nextAction, next_action_due_on: body.nextActionDueOn ?? null,
      evidence_level: body.evidenceLevel, idempotency_key: body.idempotencyKey, source: "dashboard",
      created_by: user.id, updated_by: user.id
    }, { onConflict: "organization_id,idempotency_key", ignoreDuplicates: true }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 422 });
  }
}

