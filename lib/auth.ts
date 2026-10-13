import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function requireMembership() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("UNAUTHORIZED");
  // Usa limit(1) em vez de single(): usuário pode ter >1 membership ativa
  // e single() quebraria com erro PGRST116. Escopo segue a primeira ativa.
  const { data: memberships, error } = await supabase
    .from("organization_memberships")
    .select("organization_id,role")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1);
  const membership = memberships?.[0];
  if (error || !membership) throw new Error("FORBIDDEN");
  return { supabase, user, membership };
}

