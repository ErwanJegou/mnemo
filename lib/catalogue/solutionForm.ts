// Parsing + validation du formulaire solution (sans les steps — gérés séparément).

import type {
  ComponentStatus,
  Database,
  SolutionComplexity,
} from "@/lib/supabase/types";
import { isValidSlug, slugify } from "./slug";

export type SolutionInsert = Database["public"]["Tables"]["solutions"]["Insert"];

const COMPLEXITIES: readonly SolutionComplexity[] = ["easy", "medium", "hard"];
const STATUSES: readonly ComponentStatus[] = ["draft", "validated", "deprecated"];

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

function intOrNull(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) ? n : null;
}

function floatOrNull(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function parseSolutionForm(fd: FormData): ParseResult<SolutionInsert> {
  const errors: Record<string, string> = {};

  const title = str(fd, "title");
  if (title === "") errors.title = "Titre obligatoire.";

  const slugRaw = str(fd, "slug");
  const slug = slugRaw === "" ? slugify(title) : slugRaw;
  if (slug === "") errors.slug = "Slug invalide.";
  else if (!isValidSlug(slug)) errors.slug = "Slug : minuscules, chiffres, tirets.";

  const problem = str(fd, "problem_statement");
  if (problem === "") errors.problem_statement = "Énoncé du problème obligatoire.";

  const complexity = str(fd, "complexity");
  if (!(COMPLEXITIES as readonly string[]).includes(complexity))
    errors.complexity = "Complexité invalide.";

  const status = str(fd, "status");
  if (!(STATUSES as readonly string[]).includes(status))
    errors.status = "Statut invalide.";

  const position = intOrNull(fd, "position") ?? 0;
  if (position < 0 || position > 1000) errors.position = "Position 0-1000.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      slug,
      title,
      problem_statement: problem,
      audience: strOrNull(fd, "audience"),
      complexity: complexity as SolutionComplexity,
      total_price_estimate_eur: floatOrNull(fd, "total_price_estimate_eur"),
      estimated_setup_minutes: intOrNull(fd, "estimated_setup_minutes"),
      status: status as ComponentStatus,
      hero_emoji: strOrNull(fd, "hero_emoji"),
      hero_color: strOrNull(fd, "hero_color"),
      position,
    },
  };
}
