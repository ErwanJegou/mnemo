// Parsing + validation des FormData pour port_types.

import type { Database } from "@/lib/supabase/types";
import { isValidSlug } from "./slug";

export type PortTypeInsert = Database["public"]["Tables"]["port_types"]["Insert"];

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

// Slug toléré pour port_types : "family/specific" (ex. "embedding/dense").
// On accepte un seul slash entre deux segments valides.
const PORT_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/u;

function isValidPortSlug(s: string): boolean {
  return PORT_SLUG_REGEX.test(s);
}

export function parsePortTypeForm(fd: FormData): ParseResult<PortTypeInsert> {
  const errors: Record<string, string> = {};

  const name = str(fd, "name");
  if (name === "") errors.name = "Nom obligatoire.";

  const slug = str(fd, "slug");
  if (slug === "") errors.slug = "Slug obligatoire (ex. embedding/dense).";
  else if (!isValidPortSlug(slug))
    errors.slug = "Slug invalide. Format : `family/specific` (minuscules, chiffres, tirets).";

  const family = str(fd, "family");
  if (family === "") errors.family = "Famille obligatoire.";
  else if (!isValidSlug(family)) errors.family = "Famille : minuscules, chiffres, tirets uniquement.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      slug,
      name,
      family,
      description: strOrNull(fd, "description"),
    },
  };
}
