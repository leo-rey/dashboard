"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setMessage("");
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/confirm`;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
    setMessage(error ? error.message : "Link de acesso enviado. Verifique seu e-mail."); setPending(false);
  }
  return <main className="loginShell"><section className="loginCard"><div className="brand">ANTLIA<small>COCKPIT COMERCIAL</small></div><h1>Acesso seguro</h1><p>Entre com o e-mail previamente autorizado pela administração.</p><form onSubmit={login}><label htmlFor="email">E-mail corporativo</label><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"/><button className="button primary" disabled={pending}>{pending ? "Enviando…" : "Enviar link de acesso"}</button></form>{message && <p role="status" className="statusMessage">{message}</p>}</section></main>;
}

