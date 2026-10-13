import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMembership } from "@/lib/auth";
import { homologationSchema } from "@/lib/validation";

function normalizeCompanyName(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  try {
    const body = homologationSchema.parse(await request.json());
    const { supabase, user, membership } = await requireMembership();

    if (body.accountId) {
      const { data: account } = await supabase
        .from("accounts")
        .select("id")
        .eq("id", body.accountId)
        .eq("organization_id", membership.organization_id)
        .maybeSingle();
      if (!account) return NextResponse.json({ error: "account not found in organization" }, { status: 403 });
    }

    const payload = {
      organization_id: membership.organization_id,
      account_id: body.accountId ?? null,
      company_name: body.companyName,
      normalized_company_name: normalizeCompanyName(body.companyName),
      status: body.status,
      owner_name: body.ownerName ?? null,
      supplier_portal_url: body.supplierPortalUrl ?? null,
      buyer_area_contact: body.buyerAreaContact ?? null,
      last_action: body.lastAction ?? null,
      last_action_at: body.lastActionAt ?? null,
      next_action: body.nextAction ?? null,
      next_action_due_on: body.nextActionDueOn ?? null,
      notes: body.notes ?? null,
      evidence_level: body.evidenceLevel,
      idempotency_key: body.idempotencyKey,
      source: "homologation_intake",
      created_by: user.id,
      updated_by: user.id,
    };

    const { data, error } = await supabase
      .from("supplier_homologations")
      .upsert(payload, { onConflict: "organization_id,idempotency_key", ignoreDuplicates: true })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[api/homologations] upsert failed", error.message);
      return NextResponse.json({ error: "conflict" }, { status: 409 });
    }

    if (!data) {
      const { data: existing } = await supabase
        .from("supplier_homologations")
        .select("*")
        .eq("organization_id", membership.organization_id)
        .eq("idempotency_key", body.idempotencyKey)
        .maybeSingle();
      return NextResponse.json({ data: existing, deduplicated: true }, { status: 200 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "validation failed", issues: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Invalid request";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    console.error("[api/homologations] unexpected", message);
    return NextResponse.json({ error: "invalid request" }, { status: 422 });
  }
}
