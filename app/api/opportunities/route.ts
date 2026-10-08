import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMembership } from "@/lib/auth";
import { opportunitySchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = opportunitySchema.parse(await request.json());
    const { supabase, user, membership } = await requireMembership();
    const { data: account } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", body.accountId)
      .eq("organization_id", membership.organization_id)
      .single();
    if (!account) return NextResponse.json({ error: "account not found in organization" }, { status: 403 });
    if (body.stageId) {
      const { data: stage } = await supabase.from("opportunity_stages").select("id").eq("id", body.stageId).single();
      if (!stage) return NextResponse.json({ error: "stage not found" }, { status: 403 });
    }
    const { data, error } = await supabase.from("opportunities").upsert({
      organization_id: membership.organization_id, account_id: body.accountId, title: body.title,
      owner_id: body.ownerId ?? user.id, stage_id: body.stageId ?? null, value_amount: body.value,
      probability: body.probability, expected_close_on: body.expectedCloseOn ?? null, problem: body.problem,
      next_action: body.nextAction, next_action_due_on: body.nextActionDueOn ?? null,
      evidence_level: body.evidenceLevel, idempotency_key: body.idempotencyKey, source: "dashboard",
      created_by: user.id, updated_by: user.id
    }, { onConflict: "organization_id,idempotency_key", ignoreDuplicates: true }).select().single();
    if (error) {
      console.error("[api/opportunities] upsert failed", error.message);
      return NextResponse.json({ error: "conflict" }, { status: 409 });
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "validation failed", issues: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Invalid request";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    console.error("[api/opportunities] unexpected", message);
    return NextResponse.json({ error: "invalid request" }, { status: 422 });
  }
}

