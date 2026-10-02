import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth";
import { activitySchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = activitySchema.parse(await request.json());
    const { supabase, user, membership } = await requireMembership();
    const { data, error } = await supabase.from("activity_batches").upsert({
      organization_id: membership.organization_id, owner_id: user.id, created_by: user.id,
      idempotency_key: body.idempotencyKey, effective_on: body.occurredOn, channel_id: body.channelId ?? null,
      contacts_count: body.contacts, invites_count: body.invites, messages_count: body.messages,
      replies_count: body.replies, conversations_count: body.conversations, meetings_count: body.meetings,
      opportunities_count: body.opportunities, notes: body.note, evidence_level: body.evidenceLevel, source: "dashboard"
    }, { onConflict: "organization_id,idempotency_key", ignoreDuplicates: true }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 422 });
  }
}

