"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminEmails, isAdminEmail } from "@/lib/auth/isAdmin";
import { parseHardwareForm } from "@/lib/catalogue/hardwareForm";
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

export async function createHardware(formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = parseHardwareForm(formData);
  if (!parsed.ok) {
    redirect(`/admin/hardware/new?errors=${encodeErrors(parsed.errors)}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("hardware_recipes").insert(parsed.data);
  if (error !== null) {
    redirect(`/admin/hardware/new?errors=${encodeErrors({ global: error.message })}`);
  }

  revalidatePath("/admin/hardware");
  redirect("/admin/hardware?ok=created");
}

export async function updateHardware(id: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = parseHardwareForm(formData);
  if (!parsed.ok) {
    redirect(`/admin/hardware/${id}/edit?errors=${encodeErrors(parsed.errors)}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("hardware_recipes").update(parsed.data).eq("id", id);
  if (error !== null) {
    redirect(`/admin/hardware/${id}/edit?errors=${encodeErrors({ global: error.message })}`);
  }

  revalidatePath(`/admin/hardware/${id}/edit`);
  revalidatePath("/admin/hardware");
  redirect("/admin/hardware?ok=updated");
}

export async function deleteHardware(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    redirect("/admin/hardware?erreur=" + encodeURIComponent("ID manquant."));
  }

  const admin = createAdminClient();
  const { error } = await admin.from("hardware_recipes").delete().eq("id", id as string);
  if (error !== null) {
    redirect("/admin/hardware?erreur=" + encodeURIComponent(error.message));
  }

  revalidatePath("/admin/hardware");
  redirect("/admin/hardware?ok=deleted");
}
