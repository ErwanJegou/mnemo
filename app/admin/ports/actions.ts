"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminEmails, isAdminEmail } from "@/lib/auth/isAdmin";
import { parsePortTypeForm } from "@/lib/catalogue/portTypeForm";
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

export async function createPortType(formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = parsePortTypeForm(formData);
  if (!parsed.ok) redirect(`/admin/ports/new?errors=${enc(parsed.errors)}`);
  const admin = createAdminClient();
  const { error } = await admin.from("port_types").insert(parsed.data);
  if (error !== null) redirect(`/admin/ports/new?errors=${enc({ global: error.message })}`);
  revalidatePath("/admin/ports");
  redirect("/admin/ports?ok=created");
}

export async function updatePortType(id: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = parsePortTypeForm(formData);
  if (!parsed.ok) redirect(`/admin/ports/${id}/edit?errors=${enc(parsed.errors)}`);
  const admin = createAdminClient();
  const { error } = await admin.from("port_types").update(parsed.data).eq("id", id);
  if (error !== null) redirect(`/admin/ports/${id}/edit?errors=${enc({ global: error.message })}`);
  revalidatePath(`/admin/ports/${id}/edit`);
  revalidatePath("/admin/ports");
  redirect("/admin/ports?ok=updated");
}

export async function deletePortType(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    redirect("/admin/ports?erreur=" + encodeURIComponent("ID manquant."));
  }
  const admin = createAdminClient();
  const { error } = await admin.from("port_types").delete().eq("id", id as string);
  if (error !== null) {
    redirect("/admin/ports?erreur=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/ports");
  redirect("/admin/ports?ok=deleted");
}
