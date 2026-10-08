import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMembership } from "@/lib/auth";
import { activitySchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = activitySchema.parse(await request.json());
    const { supabase, user, membership } = await requireMembership();
    if (body.channelId) {
      const { data: channel } = await supabase
        .from("channels")
        .select("id")
        .eq("id", body.channelId)
        .single();
      if (!channel) return NextResponse.json({ error: "channel not found" }, { status: 403 });
    }
    const { data, error } = await supabase.from("activity_batches").upsert({
      organization_id: membership.organization_id, owner_id: user.id, created_by: user.id,
      idempotency_key: body.idempotencyKey, effective_on: body.occurredOn, channel_id: body.channelId ?? null,
      contacts_count: body.contacts, invites_count: body.invites, messages_count: body.messages,
      replies_count: body.replies, conversations_count: body.conversations, meetings_count: body.meetings,
      opportunities_count: body.opportunities, notes: body.note, evidence_level: body.evidenceLevel, source: "dashboard"
    }, { onConflict: "organization_id,idempotency_key", ignoreDuplicates: true }).select().single();
    if (error) {
      console.error("[api/activities] upsert failed", error.message);
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
    console.error("[api/activities] unexpected", message);
    return NextResponse.json({ error: "invalid request" }, { status: 422 });
  }
}

