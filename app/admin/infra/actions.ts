"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminEmails, isAdminEmail } from "@/lib/auth/isAdmin";
import { parseInfraForm } from "@/lib/catalogue/infraForm";
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

async function knownVendorIds(): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("vendors").select("id");
  if (error !== null) throw error;
  return new Set(data.map((r) => r.id));
}

export async function createInfra(formData: FormData): Promise<void> {
  await assertAdmin();
  const vendors = await knownVendorIds();
  const parsed = parseInfraForm(formData, { vendors });
  if (!parsed.ok) {
    redirect(`/admin/infra/new?errors=${encodeErrors(parsed.errors)}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("infra_targets").insert(parsed.data);
  if (error !== null) {
    redirect(`/admin/infra/new?errors=${encodeErrors({ global: error.message })}`);
  }

  revalidatePath("/admin/infra");
  revalidatePath("/admin");
  redirect("/admin/infra?ok=created");
}

export async function updateInfra(id: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const vendors = await knownVendorIds();
  const parsed = parseInfraForm(formData, { vendors });
  if (!parsed.ok) {
    redirect(`/admin/infra/${id}/edit?errors=${encodeErrors(parsed.errors)}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("infra_targets").update(parsed.data).eq("id", id);
  if (error !== null) {
    redirect(`/admin/infra/${id}/edit?errors=${encodeErrors({ global: error.message })}`);
  }

  revalidatePath(`/admin/infra/${id}/edit`);
  revalidatePath("/admin/infra");
  redirect("/admin/infra?ok=updated");
}

export async function deleteInfra(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    redirect("/admin/infra?erreur=" + encodeURIComponent("ID manquant."));
  }

  const admin = createAdminClient();
  const { error } = await admin.from("infra_targets").delete().eq("id", id as string);
  if (error !== null) {
    redirect("/admin/infra?erreur=" + encodeURIComponent(error.message));
  }

  revalidatePath("/admin/infra");
  redirect("/admin/infra?ok=deleted");
}
