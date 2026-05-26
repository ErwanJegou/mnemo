"use server";

// Sauvegarde une configuration (profil wizard + recommandation calculée)
// dans le cercle personnel de l'utilisateur. RLS Postgres garantit que
// l'insertion ne passe que dans un cercle dont l'utilisateur est membre.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SaveInput = {
  label: string;
  profile: unknown;
  recommendation: unknown;
};

export async function saveConfiguration(input: SaveInput): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) {
    redirect("/connexion");
  }

  const { data: memberships } = await supabase
    .from("memberships")
    .select("circle_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  const circleId = memberships?.[0]?.circle_id;
  if (circleId === undefined) {
    redirect("/espace?erreur=cercle-introuvable");
  }

  const trimmed = input.label.trim();
  const label = trimmed === "" ? null : trimmed;

  const { error } = await supabase.from("configurations").insert({
    circle_id: circleId,
    created_by: user.id,
    label,
    profile: input.profile,
    recommendation: input.recommendation,
  });

  if (error !== null) {
    redirect(`/espace?erreur=${encodeURIComponent(error.message)}`);
  }

  redirect("/espace?saved=1");
}
