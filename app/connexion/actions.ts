"use server";

// Server Action de connexion par lien magique (Supabase Auth, OTP email).
// On dérive l'origine depuis les headers de la requête pour construire
// l'URL de callback — pas de variable d'env à maintenir par environnement.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export async function requestMagicLink(formData: FormData): Promise<void> {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  if (!EMAIL_REGEX.test(email)) {
    redirect(`/connexion?erreur=${encodeURIComponent("Adresse e-mail invalide.")}`);
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const callbackUrl = `${proto}://${host}/auth/callback`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl },
  });

  if (error !== null) {
    redirect(`/connexion?erreur=${encodeURIComponent(error.message)}`);
  }

  redirect(`/connexion?envoye=${encodeURIComponent(email)}`);
}
