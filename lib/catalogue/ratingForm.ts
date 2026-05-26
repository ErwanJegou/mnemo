// Parsing + validation du formulaire brick_quality_rating.

import type { Database, RatingSource } from "@/lib/supabase/types";

export type RatingInsert = Database["public"]["Tables"]["brick_quality_ratings"]["Insert"];

const SOURCES: readonly RatingSource[] = ["internal", "user_report", "vendor_doc"];
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/u;

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

export type RatingKnownIds = { bricks: ReadonlySet<string> };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function strOrNull(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

function floatOrNull(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function parseRatingForm(fd: FormData, known: RatingKnownIds): ParseResult<RatingInsert> {
  const errors: Record<string, string> = {};

  const brickId = str(fd, "brick_id");
  if (brickId === "") errors.brick_id = "Brique obligatoire.";
  else if (!known.bricks.has(brickId)) errors.brick_id = "Brique introuvable.";

  const useCase = str(fd, "use_case");
  if (useCase === "") errors.use_case = "Cas d'usage obligatoire (ex. OCR facture).";

  const scoreRaw = str(fd, "score");
  const score = Number.parseInt(scoreRaw, 10);
  if (!Number.isInteger(score) || score < 1 || score > 5)
    errors.score = "Score 1-5.";

  const sourceRaw = str(fd, "source");
  if (!(SOURCES as readonly string[]).includes(sourceRaw))
    errors.source = "Source invalide.";

  const ratedAt = strOrNull(fd, "rated_at");
  if (ratedAt !== null && !ISO_DATE_REGEX.test(ratedAt))
    errors.rated_at = "Date format YYYY-MM-DD.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      brick_id: brickId,
      use_case: useCase,
      score,
      cost_per_op_eur: floatOrNull(fd, "cost_per_op_eur"),
      cost_unit: strOrNull(fd, "cost_unit"),
      notes: strOrNull(fd, "notes"),
      source: sourceRaw as RatingSource,
      rated_at: ratedAt,
    },
  };
}
