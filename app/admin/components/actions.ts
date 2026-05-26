"use server";

// Server actions du CRUD composant (admin). Double garde admin (layout +
// assertion) + writes via service role (bypass RLS).
// Insert/update du composant principal + sync des relations many-to-many
// (brick_ports, brick_infra_targets) en une transaction logique.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminEmails, isAdminEmail } from "@/lib/auth/isAdmin";
import { parseComponentForm, type KnownIds } from "@/lib/catalogue/componentForm";
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

async function loadKnownIds(): Promise<KnownIds> {
  const admin = createAdminClient();
  const [vendors, categories, portTypes, infraTargets] = await Promise.all([
    admin.from("vendors").select("id"),
    admin.from("brick_categories").select("id"),
    admin.from("port_types").select("id"),
    admin.from("infra_targets").select("id"),
  ]);
  if (vendors.error !== null) throw vendors.error;
  if (categories.error !== null) throw categories.error;
  if (portTypes.error !== null) throw portTypes.error;
  if (infraTargets.error !== null) throw infraTargets.error;
  return {
    vendors: new Set(vendors.data.map((r) => r.id)),
    categories: new Set(categories.data.map((r) => r.id)),
    portTypes: new Set(portTypes.data.map((r) => r.id)),
    infraTargets: new Set(infraTargets.data.map((r) => r.id)),
  };
}

async function syncBrickPorts(
  brickId: string,
  portInIds: string[],
  portOutIds: string[],
): Promise<void> {
  const admin = createAdminClient();
  const { error: delErr } = await admin
    .from("brick_ports")
    .delete()
    .eq("brick_id", brickId);
  if (delErr !== null) throw delErr;

  const rows = [
    ...portInIds.map((id) => ({
      brick_id: brickId,
      port_type_id: id,
      direction: "in" as const,
      required: true,
      notes: null,
    })),
    ...portOutIds.map((id) => ({
      brick_id: brickId,
      port_type_id: id,
      direction: "out" as const,
      required: true,
      notes: null,
    })),
  ];
  if (rows.length > 0) {
    const { error } = await admin.from("brick_ports").insert(rows);
    if (error !== null) throw error;
  }
}

async function syncBrickInfra(
  brickId: string,
  infraTargetIds: string[],
): Promise<void> {
  const admin = createAdminClient();
  const { error: delErr } = await admin
    .from("brick_infra_targets")
    .delete()
    .eq("brick_id", brickId);
  if (delErr !== null) throw delErr;

  if (infraTargetIds.length > 0) {
    const rows = infraTargetIds.map((id) => ({
      brick_id: brickId,
      infra_target_id: id,
      recommended: false,
      notes: null,
    }));
    const { error } = await admin.from("brick_infra_targets").insert(rows);
    if (error !== null) throw error;
  }
}

export async function createComponent(formData: FormData): Promise<void> {
  await assertAdmin();
  const known = await loadKnownIds();
  const parsed = parseComponentForm(formData, known);
  if (!parsed.ok) {
    redirect(`/admin/components/new?errors=${encodeErrors(parsed.errors)}`);
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin
    .from("components")
    .insert(parsed.data.component)
    .select("id")
    .single();

  if (error !== null) {
    redirect(
      `/admin/components/new?errors=${encodeErrors({ global: error.message })}`,
    );
  }

  try {
    await syncBrickPorts(created.id, parsed.data.portInIds, parsed.data.portOutIds);
    await syncBrickInfra(created.id, parsed.data.infraTargetIds);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur lors de la synchronisation des relations.";
    redirect(`/admin/components/${created.id}/edit?errors=${encodeErrors({ global: msg })}`);
  }

  revalidatePath("/admin");
  redirect("/admin?ok=component-created");
}

export async function updateComponent(id: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const known = await loadKnownIds();
  const parsed = parseComponentForm(formData, known);
  if (!parsed.ok) {
    redirect(`/admin/components/${id}/edit?errors=${encodeErrors(parsed.errors)}`);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("components")
    .update(parsed.data.component)
    .eq("id", id);
  if (error !== null) {
    redirect(
      `/admin/components/${id}/edit?errors=${encodeErrors({ global: error.message })}`,
    );
  }

  try {
    await syncBrickPorts(id, parsed.data.portInIds, parsed.data.portOutIds);
    await syncBrickInfra(id, parsed.data.infraTargetIds);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur lors de la synchronisation des relations.";
    redirect(`/admin/components/${id}/edit?errors=${encodeErrors({ global: msg })}`);
  }

  revalidatePath(`/admin/components/${id}/edit`);
  revalidatePath("/admin");
  redirect(`/admin/components/${id}/edit?ok=updated`);
}

export async function deleteComponent(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    redirect("/admin?erreur=" + encodeURIComponent("ID composant manquant."));
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("components")
    .delete()
    .eq("id", id as string);
  if (error !== null) {
    redirect("/admin?erreur=" + encodeURIComponent(error.message));
  }

  revalidatePath("/admin");
  redirect("/admin?ok=component-deleted");
}
