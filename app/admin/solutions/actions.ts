"use server";

// Server actions du CRUD solutions + solution_steps.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminEmails, isAdminEmail } from "@/lib/auth/isAdmin";
import { parseSolutionForm } from "@/lib/catalogue/solutionForm";
import {
  parseSolutionStepForm,
  type StepKnownIds,
} from "@/lib/catalogue/solutionStepForm";
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

async function loadStepKnownIds(): Promise<StepKnownIds> {
  const admin = createAdminClient();
  const [categories, bricks, ports] = await Promise.all([
    admin.from("brick_categories").select("id"),
    admin.from("components").select("id"),
    admin.from("port_types").select("id"),
  ]);
  if (categories.error !== null) throw categories.error;
  if (bricks.error !== null) throw bricks.error;
  if (ports.error !== null) throw ports.error;
  return {
    categories: new Set(categories.data.map((r) => r.id)),
    bricks: new Set(bricks.data.map((r) => r.id)),
    ports: new Set(ports.data.map((r) => r.id)),
  };
}

// ─── Solutions ────────────────────────────────────────────────────────────

export async function createSolution(formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = parseSolutionForm(formData);
  if (!parsed.ok) redirect(`/admin/solutions/new?errors=${enc(parsed.errors)}`);
  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("solutions")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error !== null) redirect(`/admin/solutions/new?errors=${enc({ global: error.message })}`);
  revalidatePath("/admin/solutions");
  revalidatePath("/");
  redirect(`/admin/solutions/${created.id}/edit?ok=created`);
}

export async function updateSolution(id: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = parseSolutionForm(formData);
  if (!parsed.ok) redirect(`/admin/solutions/${id}/edit?errors=${enc(parsed.errors)}`);
  const admin = createAdminClient();
  const { error } = await admin.from("solutions").update(parsed.data).eq("id", id);
  if (error !== null) redirect(`/admin/solutions/${id}/edit?errors=${enc({ global: error.message })}`);
  revalidatePath(`/admin/solutions/${id}/edit`);
  revalidatePath("/admin/solutions");
  revalidatePath("/");
  revalidatePath(`/solutions/${parsed.data.slug}`);
  redirect(`/admin/solutions/${id}/edit?ok=updated`);
}

export async function deleteSolution(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    redirect("/admin/solutions?erreur=" + encodeURIComponent("ID manquant."));
  }
  const admin = createAdminClient();
  const { error } = await admin.from("solutions").delete().eq("id", id as string);
  if (error !== null) {
    redirect("/admin/solutions?erreur=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/solutions");
  revalidatePath("/");
  redirect("/admin/solutions?ok=deleted");
}

// ─── Steps ────────────────────────────────────────────────────────────────

export async function createStep(solutionId: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const known = await loadStepKnownIds();
  const parsed = parseSolutionStepForm(formData, solutionId, known);
  if (!parsed.ok)
    redirect(`/admin/solutions/${solutionId}/steps/new?errors=${enc(parsed.errors)}`);
  const admin = createAdminClient();
  const { error } = await admin.from("solution_steps").insert(parsed.data);
  if (error !== null)
    redirect(
      `/admin/solutions/${solutionId}/steps/new?errors=${enc({ global: error.message })}`,
    );
  revalidatePath(`/admin/solutions/${solutionId}/edit`);
  revalidatePath("/");
  redirect(`/admin/solutions/${solutionId}/edit?ok=step-created`);
}

export async function updateStep(
  solutionId: string,
  stepId: string,
  formData: FormData,
): Promise<void> {
  await assertAdmin();
  const known = await loadStepKnownIds();
  const parsed = parseSolutionStepForm(formData, solutionId, known);
  if (!parsed.ok)
    redirect(
      `/admin/solutions/${solutionId}/steps/${stepId}/edit?errors=${enc(parsed.errors)}`,
    );
  const admin = createAdminClient();
  const { error } = await admin.from("solution_steps").update(parsed.data).eq("id", stepId);
  if (error !== null)
    redirect(
      `/admin/solutions/${solutionId}/steps/${stepId}/edit?errors=${enc({ global: error.message })}`,
    );
  revalidatePath(`/admin/solutions/${solutionId}/edit`);
  revalidatePath(`/admin/solutions/${solutionId}/steps/${stepId}/edit`);
  revalidatePath("/");
  redirect(`/admin/solutions/${solutionId}/edit?ok=step-updated`);
}

export async function deleteStep(solutionId: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    redirect(
      `/admin/solutions/${solutionId}/edit?erreur=${encodeURIComponent("ID step manquant.")}`,
    );
  }
  const admin = createAdminClient();
  const { error } = await admin.from("solution_steps").delete().eq("id", id as string);
  if (error !== null) {
    redirect(
      `/admin/solutions/${solutionId}/edit?erreur=${encodeURIComponent(error.message)}`,
    );
  }
  revalidatePath(`/admin/solutions/${solutionId}/edit`);
  revalidatePath("/");
  redirect(`/admin/solutions/${solutionId}/edit?ok=step-deleted`);
}
