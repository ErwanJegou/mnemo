// Parsing + validation des FormData du form vendor (admin).
// Helper pur sans dépendance Next — testable en isolation.

import type { Database, SovereigntyZone } from "@/lib/supabase/types";
import { isValidSlug, slugify } from "./slug";

export type VendorFormValues = Database["public"]["Tables"]["vendors"]["Insert"];

const ZONES: readonly SovereigntyZone[] = ["eu", "us", "maroc", "other"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const URL_REGEX = /^https?:\/\/[^\s]+$/u;

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

/** Parse le formulaire vendor en VendorInsert ou retourne les erreurs par champ. */
export function parseVendorForm(fd: FormData): ParseResult<VendorFormValues> {
  const errors: Record<string, string> = {};

  const name = str(fd, "name");
  if (name === "") errors.name = "Le nom est obligatoire.";

  const slugRaw = str(fd, "slug");
  const slug = slugRaw === "" ? slugify(name) : slugRaw;
  if (slug === "") errors.slug = "Slug invalide (laisser vide pour auto-générer depuis le nom).";
  else if (!isValidSlug(slug))
    errors.slug = "Slug invalide : minuscules, chiffres et tirets uniquement.";

  const zoneRaw = str(fd, "sovereignty_zone");
  if (!(ZONES as readonly string[]).includes(zoneRaw)) {
    errors.sovereignty_zone = "Zone de souveraineté invalide.";
  }

  const website = strOrNull(fd, "website");
  if (website !== null && !URL_REGEX.test(website))
    errors.website = "URL invalide (doit commencer par http(s)://).";

  const contactEmail = strOrNull(fd, "contact_email");
  if (contactEmail !== null && !EMAIL_REGEX.test(contactEmail))
    errors.contact_email = "Adresse e-mail invalide.";

  const contactFormUrl = strOrNull(fd, "contact_form_url");
  if (contactFormUrl !== null && !URL_REGEX.test(contactFormUrl))
    errors.contact_form_url = "URL invalide (doit commencer par http(s)://).";

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      slug,
      name,
      country: strOrNull(fd, "country"),
      sovereignty_zone: zoneRaw as SovereigntyZone,
      website,
      contact_email: contactEmail,
      contact_form_url: contactFormUrl,
      notes: strOrNull(fd, "notes"),
    },
  };
}
