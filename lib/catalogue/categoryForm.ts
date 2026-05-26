// Parsing + validation des FormData pour brick_categories.

import type { BrickRank, Database } from "@/lib/supabase/types";
import { RANK_ORDER } from "@/lib/catalogue/labels";
import { isValidSlug, slugify } from "./slug";

export type CategoryInsert = Database["public"]["Tables"]["brick_categories"]["Insert"];

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function strOrNull(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

export function parseCategoryForm(fd: FormData): ParseResult<CategoryInsert> {
  const errors: Record<string, string> = {};

  const name = str(fd, "name");
  if (name === "") errors.name = "Nom obligatoire.";

  const slugRaw = str(fd, "slug");
  const slug = slugRaw === "" ? slugify(name) : slugRaw;
  if (slug === "") errors.slug = "Slug invalide.";
  else if (!isValidSlug(slug))
    errors.slug = "Slug : minuscules, chiffres et tirets uniquement.";

  const rankRaw = str(fd, "rank");
  if (!(RANK_ORDER as readonly string[]).includes(rankRaw))
    errors.rank = "Rang invalide.";

  const positionRaw = str(fd, "position");
  const position = Number.parseInt(positionRaw === "" ? "0" : positionRaw, 10);
  if (!Number.isInteger(position) || position < 0 || position > 100)
    errors.position = "Position invalide (0-100).";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      slug,
      name,
      rank: rankRaw as BrickRank,
      position,
      description: strOrNull(fd, "description"),
    },
  };
}
