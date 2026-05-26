"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminEmails, isAdminEmail } from "@/lib/auth/isAdmin";
import { parseRatingForm } from "@/lib/catalogue/ratingForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null || !isAdminEmail(user.email, getAdminEmails())) {
    throw new Error("Accès admin requis.");
  }
}

function enc(errors: Record<string, string>): string {
  return encodeURIComponent(JSON.stringify(errors));
}

async function knownBrickIds(): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("components").select("id");
  if (error !== null) throw error;
  return new Set(data.map((r) => r.id));
}

export async function createRating(formData: FormData): Promise<void> {
  await assertAdmin();
  const bricks = await knownBrickIds();
  const parsed = parseRatingForm(formData, { bricks });
  if (!parsed.ok) redirect(`/admin/ratings/new?errors=${enc(parsed.errors)}`);
  const admin = createAdminClient();
  const { error } = await admin.from("brick_quality_ratings").insert(parsed.data);
  if (error !== null) redirect(`/admin/ratings/new?errors=${enc({ global: error.message })}`);
  revalidatePath("/admin/ratings");
  redirect("/admin/ratings?ok=created");
}

export async function updateRating(id: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const bricks = await knownBrickIds();
  const parsed = parseRatingForm(formData, { bricks });
  if (!parsed.ok) redirect(`/admin/ratings/${id}/edit?errors=${enc(parsed.errors)}`);
  const admin = createAdminClient();
  const { error } = await admin.from("brick_quality_ratings").update(parsed.data).eq("id", id);
  if (error !== null) redirect(`/admin/ratings/${id}/edit?errors=${enc({ global: error.message })}`);
  revalidatePath(`/admin/ratings/${id}/edit`);
  revalidatePath("/admin/ratings");
  redirect("/admin/ratings?ok=updated");
}

export async function deleteRating(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    redirect("/admin/ratings?erreur=" + encodeURIComponent("ID manquant."));
  }
  const admin = createAdminClient();
  const { error } = await admin.from("brick_quality_ratings").delete().eq("id", id as string);
  if (error !== null) {
    redirect("/admin/ratings?erreur=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/ratings");
  redirect("/admin/ratings?ok=deleted");
}
