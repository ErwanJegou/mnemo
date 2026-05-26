"use server";

// Actions de l'espace utilisateur :
//   - basculer le consentement réseau (F9, opt-in horodaté pour le moat ③) ;
//   - se déconnecter ;
//   - supprimer une configuration enregistrée.
// Le `circle_id` cible vient toujours du cercle personnel de l'utilisateur
// (créé par le trigger `handle_new_user` à l'inscription).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleNetworkConsent(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    redirect("/connexion");
  }

  const circleId = String(formData.get("circle_id") ?? "");
  const next = formData.get("consent") === "on";
  if (circleId === "") {
    redirect("/espace?erreur=cercle-introuvable");
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("network_consents").upsert(
    {
      circle_id: circleId,
      user_id: user.id,
      scope: "cost_network",
      consented: next,
      consented_at: next ? now : null,
      revoked_at: next ? null : now,
    },
    { onConflict: "circle_id,user_id,scope" },
  );

  if (error !== null) {
    redirect(`/espace?erreur=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/espace");
}

export async function deleteConfiguration(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id === "") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    redirect("/connexion");
  }

  const { error } = await supabase.from("configurations").delete().eq("id", id);
  if (error !== null) {
    redirect(`/espace?erreur=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/espace");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
