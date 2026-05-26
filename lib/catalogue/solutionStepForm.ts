// Parsing + validation du formulaire d'une étape de solution.

import type { Database } from "@/lib/supabase/types";

export type SolutionStepInsert = Database["public"]["Tables"]["solution_steps"]["Insert"];

export type ParseResult<T> =
  | { ok: true; data: SolutionStepInsert }
  | { ok: false; errors: Record<string, string> };

export type StepKnownIds = {
  categories: ReadonlySet<string>;
  bricks: ReadonlySet<string>;
  ports: ReadonlySet<string>;
};

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function strOrNull(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

function multi(fd: FormData, key: string): string[] {
  return fd
    .getAll(key)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

export function parseSolutionStepForm(
  fd: FormData,
  solutionId: string,
  known: StepKnownIds,
): ParseResult<SolutionStepInsert> {
  const errors: Record<string, string> = {};

  const title = str(fd, "title");
  if (title === "") errors.title = "Titre obligatoire.";

  const positionRaw = str(fd, "position");
  const position = Number.parseInt(positionRaw, 10);
  if (!Number.isInteger(position) || position < 1 || position > 100)
    errors.position = "Position 1-100.";

  function chkOrNull(key: string, set: ReadonlySet<string>, label: string): string | null {
    const v = str(fd, key);
    if (v === "") return null;
    if (!set.has(v)) {
      errors[key] = `${label} introuvable.`;
      return null;
    }
    return v;
  }

  const requiredCategoryId = chkOrNull("required_category_id", known.categories, "Catégorie");
  const recommendedBrickId = chkOrNull("recommended_brick_id", known.bricks, "Brique recommandée");
  const inputPortId = chkOrNull("input_port_id", known.ports, "Port d'entrée");
  const outputPortId = chkOrNull("output_port_id", known.ports, "Port de sortie");

  const alternativeBrickIds = multi(fd, "alternative_brick_ids");
  for (const id of alternativeBrickIds) {
    if (!known.bricks.has(id)) {
      errors.alternative_brick_ids = "Une alternative est introuvable.";
      break;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      solution_id: solutionId,
      position,
      title,
      description: strOrNull(fd, "description"),
      required_category_id: requiredCategoryId,
      recommended_brick_id: recommendedBrickId,
      alternative_brick_ids: alternativeBrickIds,
      input_port_id: inputPortId,
      output_port_id: outputPortId,
      decision_notes: strOrNull(fd, "decision_notes"),
    },
  };
}
