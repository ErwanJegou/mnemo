"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminEmails, isAdminEmail } from "@/lib/auth/isAdmin";
import { parseCategoryForm } from "@/lib/catalogue/categoryForm";
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

export async function createCategory(formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = parseCategoryForm(formData);
  if (!parsed.ok) redirect(`/admin/categories/new?errors=${enc(parsed.errors)}`);
  const admin = createAdminClient();
  const { error } = await admin.from("brick_categories").insert(parsed.data);
  if (error !== null) redirect(`/admin/categories/new?errors=${enc({ global: error.message })}`);
  revalidatePath("/admin/categories");
  revalidatePath("/admin");
  redirect("/admin/categories?ok=created");
}

export async function updateCategory(id: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = parseCategoryForm(formData);
  if (!parsed.ok) redirect(`/admin/categories/${id}/edit?errors=${enc(parsed.errors)}`);
  const admin = createAdminClient();
  const { error } = await admin.from("brick_categories").update(parsed.data).eq("id", id);
  if (error !== null) redirect(`/admin/categories/${id}/edit?errors=${enc({ global: error.message })}`);
  revalidatePath(`/admin/categories/${id}/edit`);
  revalidatePath("/admin/categories");
  revalidatePath("/admin");
  redirect("/admin/categories?ok=updated");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    redirect("/admin/categories?erreur=" + encodeURIComponent("ID manquant."));
  }
  const admin = createAdminClient();
  const { error } = await admin.from("brick_categories").delete().eq("id", id as string);
  if (error !== null) {
    redirect("/admin/categories?erreur=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/categories");
  revalidatePath("/admin");
  redirect("/admin/categories?ok=deleted");
}
