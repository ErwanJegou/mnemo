"use server";

// Server actions du CRUD vendor (admin). Toutes ces actions vérifient l'admin
// côté serveur (deuxième barrière en plus de la garde de layout), puis utilisent
// le client service role pour bypass la RLS (qui bloque les writes anon).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminEmails, isAdminEmail } from "@/lib/auth/isAdmin";
import { parseVendorForm } from "@/lib/catalogue/vendorForm";
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

function encodeErrors(errors: Record<string, string>): string {
  return encodeURIComponent(JSON.stringify(errors));
}

export async function createVendor(formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = parseVendorForm(formData);
  if (!parsed.ok) {
    redirect(`/admin/vendors/new?errors=${encodeErrors(parsed.errors)}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("vendors").insert(parsed.data);
  if (error !== null) {
    redirect(
      `/admin/vendors/new?errors=${encodeErrors({ global: error.message })}`,
    );
  }

  revalidatePath("/admin/vendors");
  revalidatePath("/admin");
  redirect("/admin/vendors?ok=created");
}

export async function updateVendor(id: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = parseVendorForm(formData);
  if (!parsed.ok) {
    redirect(`/admin/vendors/${id}/edit?errors=${encodeErrors(parsed.errors)}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("vendors").update(parsed.data).eq("id", id);
  if (error !== null) {
    redirect(
      `/admin/vendors/${id}/edit?errors=${encodeErrors({ global: error.message })}`,
    );
  }

  revalidatePath(`/admin/vendors/${id}/edit`);
  revalidatePath("/admin/vendors");
  revalidatePath("/admin");
  redirect("/admin/vendors?ok=updated");
}

export async function deleteVendor(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    redirect("/admin/vendors?erreur=" + encodeURIComponent("ID vendor manquant."));
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("vendors")
    .delete()
    .eq("id", id as string);
  if (error !== null) {
    redirect("/admin/vendors?erreur=" + encodeURIComponent(error.message));
  }

  revalidatePath("/admin/vendors");
  revalidatePath("/admin");
  redirect("/admin/vendors?ok=deleted");
}
