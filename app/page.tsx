import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Cockpit } from "@/components/cockpit";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [contacts, activities, opportunities, accounts] = await Promise.all([
    supabase.from("contacts").select("id,legacy_id,name,role_title,status_raw,linkedin_url,last_contact_at,verified_at,source,notes,account:accounts(id,canonical_name),owner:profiles!contacts_owner_id_fkey(display_name)").is("deleted_at", null).order("updated_at", { ascending: false }).limit(500),
    supabase.from("activity_batches").select("id,effective_on,contacts_count,invites_count,messages_count,replies_count,conversations_count,meetings_count,opportunities_count,notes,owner:profiles!activity_batches_owner_id_fkey(display_name),channel:channels(name)").order("effective_on", { ascending: false }).limit(200),
    supabase.from("opportunities").select("id,title,value_amount,probability,expected_close_on,next_action,next_action_due_on,evidence_level,account:accounts(id,canonical_name),owner:profiles!opportunities_owner_id_fkey(display_name),stage:opportunity_stages(name,is_closed)").is("deleted_at", null).order("updated_at", { ascending: false }).limit(200),
    supabase.from("accounts").select("id,canonical_name").is("deleted_at", null).order("canonical_name").limit(1000)
  ]);
  const firstError = contacts.error || activities.error || opportunities.error || accounts.error;
  return <Cockpit userEmail={user.email ?? "Usuário"} initialData={{ contacts: contacts.data ?? [], activities: activities.data ?? [], opportunities: opportunities.data ?? [], accounts: accounts.data ?? [], error: firstError?.message ?? null, updatedAt: new Date().toISOString() }} />;
}
