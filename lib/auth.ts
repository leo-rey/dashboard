import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function requireMembership() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("UNAUTHORIZED");
  const { data: membership, error } = await supabase.from("organization_memberships").select("organization_id,role").eq("user_id", user.id).eq("active", true).single();
  if (error || !membership) throw new Error("FORBIDDEN");
  return { supabase, user, membership };
}

