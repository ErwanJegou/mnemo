// Parsing + validation des FormData du form composant (admin).
// Helper pur, testable hors Next. Le champ `capabilities` est saisi en JSON
// libre (textarea) — on garde la simplicité, on itérera vers des
// checkboxes typées si besoin.

import type {
  ComponentStatus,
  ConfidenceLevel,
  Database,
  PresetFit,
  PricingModel,
} from "@/lib/supabase/types";
import { isValidSlug } from "./slug";

export type ComponentInsert =
  Database["public"]["Tables"]["components"]["Insert"];

export type ComponentFormParsed = {
  component: ComponentInsert;
  portInIds: string[];
  portOutIds: string[];
  infraTargetIds: string[];
};

const PRESET_VALUES: readonly PresetFit[] = ["light", "medium", "hard"];
const PRICING_VALUES: readonly PricingModel[] = ["free", "flat", "usage", "self_host", "contact"];
const CONFIDENCE_VALUES: readonly ConfidenceLevel[] = ["low", "medium", "high"];
const STATUS_VALUES: readonly ComponentStatus[] = ["draft", "validated", "deprecated"];

const URL_REGEX = /^https?:\/\/[^\s]+$/u;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/u;

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

export type KnownIds = {
  vendors: ReadonlySet<string>;
  categories?: ReadonlySet<string>;
  portTypes?: ReadonlySet<string>;
  infraTargets?: ReadonlySet<string>;
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

function parseCapabilities(
  raw: string,
): { ok: true; value: Record<string, unknown> } | { ok: false } {
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

/** Parse le formulaire composant + relations many-to-many (ports, infra). */
export function parseComponentForm(
  fd: FormData,
  known: KnownIds,
): ParseResult<ComponentFormParsed> {
  const errors: Record<string, string> = {};

  const vendorId = str(fd, "vendor_id");
  if (vendorId === "") errors.vendor_id = "Vendor obligatoire.";
  else if (!known.vendors.has(vendorId)) errors.vendor_id = "Vendor introuvable.";

  const categoryRaw = str(fd, "category_id");
  let categoryId: string | null = null;
  if (categoryRaw !== "") {
    if (known.categories !== undefined && !known.categories.has(categoryRaw)) {
      errors.category_id = "Catégorie introuvable.";
    } else {
      categoryId = categoryRaw;
    }
  }

  const layerRaw = str(fd, "layer_id");
  const layerId = Number.parseInt(layerRaw, 10);
  if (!Number.isInteger(layerId) || layerId < 0 || layerId > 6) {
    errors.layer_id = "Couche invalide (0 à 6).";
  }

  const slug = str(fd, "slug");
  if (slug === "") errors.slug = "Slug obligatoire.";
  else if (!isValidSlug(slug))
    errors.slug = "Slug invalide : minuscules, chiffres et tirets uniquement.";

  const name = str(fd, "name");
  if (name === "") errors.name = "Nom obligatoire.";

  const pricingRaw = str(fd, "pricing_model");
  if (!(PRICING_VALUES as readonly string[]).includes(pricingRaw)) {
    errors.pricing_model = "Modèle de prix invalide.";
  }

  const priceRaw = str(fd, "base_price_eur");
  const basePriceEur = Number.parseFloat(priceRaw === "" ? "0" : priceRaw);
  if (!Number.isFinite(basePriceEur) || basePriceEur < 0) {
    errors.base_price_eur = "Prix invalide (nombre positif attendu).";
  }

  const unit = str(fd, "unit");
  if (unit === "") errors.unit = "Unité obligatoire (ex. mois, requête, Go).";

  const pricingUrl = strOrNull(fd, "pricing_url");
  if (pricingUrl !== null && !URL_REGEX.test(pricingUrl)) {
    errors.pricing_url = "URL invalide (http(s)://…).";
  }

  const presetFitRaw = multi(fd, "preset_fit");
  for (const p of presetFitRaw) {
    if (!(PRESET_VALUES as readonly string[]).includes(p)) {
      errors.preset_fit = `Preset inconnu : "${p}".`;
      break;
    }
  }
  const presetFit = presetFitRaw as PresetFit[];

  const capsResult = parseCapabilities(str(fd, "capabilities"));
  if (!capsResult.ok) {
    errors.capabilities = "JSON invalide (attendu : objet, ex. { \"on_prem\": true }).";
  }

  const sourceUrl = strOrNull(fd, "source_url");
  if (sourceUrl !== null && !URL_REGEX.test(sourceUrl)) {
    errors.source_url = "URL invalide (http(s)://…).";
  }

  const lastCheckedAt = strOrNull(fd, "last_checked_at");
  if (lastCheckedAt !== null && !ISO_DATE_REGEX.test(lastCheckedAt)) {
    errors.last_checked_at = "Date invalide (format YYYY-MM-DD).";
  }

  const confidenceRaw = str(fd, "confidence");
  if (!(CONFIDENCE_VALUES as readonly string[]).includes(confidenceRaw)) {
    errors.confidence = "Niveau de confiance invalide.";
  }

  const statusRaw = str(fd, "status");
  if (!(STATUS_VALUES as readonly string[]).includes(statusRaw)) {
    errors.status = "Statut invalide.";
  }

  // Ports in / out + infra (multi-selects)
  const portInIds = multi(fd, "port_in");
  const portOutIds = multi(fd, "port_out");
  const infraTargetIds = multi(fd, "infra_targets");

  if (known.portTypes !== undefined) {
    for (const id of [...portInIds, ...portOutIds]) {
      if (!known.portTypes.has(id)) {
        errors.ports = "Port introuvable dans le catalogue.";
        break;
      }
    }
  }
  if (known.infraTargets !== undefined) {
    for (const id of infraTargetIds) {
      if (!known.infraTargets.has(id)) {
        errors.infra_targets = "Cible infra introuvable.";
        break;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      component: {
        vendor_id: vendorId,
        layer_id: layerId,
        category_id: categoryId,
        slug,
        name,
        tier: strOrNull(fd, "tier"),
        description: strOrNull(fd, "description"),
        pricing_model: pricingRaw as PricingModel,
        base_price_eur: basePriceEur,
        unit,
        pricing_url: pricingUrl,
        preset_fit: presetFit,
        capabilities: capsResult.ok ? capsResult.value : {},
        source_url: sourceUrl,
        last_checked_at: lastCheckedAt,
        confidence: confidenceRaw as ConfidenceLevel,
        status: statusRaw as ComponentStatus,
        notes: strOrNull(fd, "notes"),
        rfq_template: strOrNull(fd, "rfq_template"),
      },
      portInIds,
      portOutIds,
      infraTargetIds,
    },
  };
}
