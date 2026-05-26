// Parsing + validation des FormData du form infra_target (admin).

import type {
  ComponentStatus,
  ConfidenceLevel,
  Database,
  InfraKind,
  SovereigntyZone,
} from "@/lib/supabase/types";
import { isValidSlug, slugify } from "./slug";

export type InfraInsert = Database["public"]["Tables"]["infra_targets"]["Insert"];

const KINDS: readonly InfraKind[] = [
  "vps_managed",
  "bare_metal",
  "gpu_rented",
  "on_prem",
  "saas_managed",
];
const ZONES: readonly SovereigntyZone[] = ["eu", "us", "maroc", "other"];
const CONFIDENCES: readonly ConfidenceLevel[] = ["low", "medium", "high"];
const STATUSES: readonly ComponentStatus[] = ["draft", "validated", "deprecated"];

const URL_REGEX = /^https?:\/\/[^\s]+$/u;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/u;

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

function parseSpecs(raw: string): { ok: true; value: Record<string, unknown> } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false };
  }
}

export type InfraKnownIds = { vendors: ReadonlySet<string> };

export function parseInfraForm(fd: FormData, known: InfraKnownIds): ParseResult<InfraInsert> {
  const errors: Record<string, string> = {};

  const name = str(fd, "name");
  if (name === "") errors.name = "Nom obligatoire.";

  const slugRaw = str(fd, "slug");
  const slug = slugRaw === "" ? slugify(name) : slugRaw;
  if (slug === "") errors.slug = "Slug invalide.";
  else if (!isValidSlug(slug))
    errors.slug = "Slug : minuscules, chiffres et tirets uniquement.";

  const kindRaw = str(fd, "infra_kind");
  if (!(KINDS as readonly string[]).includes(kindRaw)) errors.infra_kind = "Type d'infra invalide.";

  const zoneRaw = str(fd, "sovereignty_zone");
  if (!(ZONES as readonly string[]).includes(zoneRaw))
    errors.sovereignty_zone = "Zone invalide.";

  const vendorRaw = str(fd, "vendor_id");
  let vendorId: string | null = null;
  if (vendorRaw !== "") {
    if (!known.vendors.has(vendorRaw)) errors.vendor_id = "Vendor introuvable.";
    else vendorId = vendorRaw;
  }

  const priceRaw = str(fd, "base_price_eur");
  const basePriceEur = Number.parseFloat(priceRaw === "" ? "0" : priceRaw);
  if (!Number.isFinite(basePriceEur) || basePriceEur < 0)
    errors.base_price_eur = "Prix invalide.";

  const unit = str(fd, "unit");
  if (unit === "") errors.unit = "Unité obligatoire.";

  const specsRes = parseSpecs(str(fd, "specs"));
  if (!specsRes.ok) errors.specs = "JSON invalide (attendu : objet).";

  const sourceUrl = strOrNull(fd, "source_url");
  if (sourceUrl !== null && !URL_REGEX.test(sourceUrl))
    errors.source_url = "URL invalide.";

  const lastCheckedAt = strOrNull(fd, "last_checked_at");
  if (lastCheckedAt !== null && !ISO_DATE_REGEX.test(lastCheckedAt))
    errors.last_checked_at = "Date format YYYY-MM-DD.";

  const confidenceRaw = str(fd, "confidence");
  if (!(CONFIDENCES as readonly string[]).includes(confidenceRaw))
    errors.confidence = "Confiance invalide.";

  const statusRaw = str(fd, "status");
  if (!(STATUSES as readonly string[]).includes(statusRaw))
    errors.status = "Statut invalide.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      slug,
      name,
      infra_kind: kindRaw as InfraKind,
      vendor_id: vendorId,
      country: strOrNull(fd, "country"),
      sovereignty_zone: zoneRaw as SovereigntyZone,
      base_price_eur: basePriceEur,
      unit,
      specs: specsRes.ok ? specsRes.value : {},
      source_url: sourceUrl,
      last_checked_at: lastCheckedAt,
      confidence: confidenceRaw as ConfidenceLevel,
      status: statusRaw as ComponentStatus,
      notes: strOrNull(fd, "notes"),
    },
  };
}
