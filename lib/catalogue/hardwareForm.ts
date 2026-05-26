// Parsing + validation des FormData du form hardware_recipe (admin).

import type {
  ComponentStatus,
  Database,
  HardwareBomItem,
} from "@/lib/supabase/types";
import { isValidSlug, slugify } from "./slug";

export type HardwareInsert = Database["public"]["Tables"]["hardware_recipes"]["Insert"];

const STATUSES: readonly ComponentStatus[] = ["draft", "validated", "deprecated"];
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

function parseBom(raw: string): { ok: true; value: HardwareBomItem[] } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: [] };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return { ok: false };
    const items: HardwareBomItem[] = [];
    for (const raw of parsed) {
      if (raw === null || typeof raw !== "object") return { ok: false };
      const rec = raw as Record<string, unknown>;
      if (typeof rec.part !== "string" || typeof rec.model !== "string") return { ok: false };
      if (typeof rec.price_eur !== "number") return { ok: false };
      items.push({
        part: rec.part,
        model: rec.model,
        price_eur: rec.price_eur,
        vendor: typeof rec.vendor === "string" ? rec.vendor : undefined,
        url: typeof rec.url === "string" ? rec.url : undefined,
        ram_gb: typeof rec.ram_gb === "number" ? rec.ram_gb : undefined,
        disk_gb: typeof rec.disk_gb === "number" ? rec.disk_gb : undefined,
      });
    }
    return { ok: true, value: items };
  } catch {
    return { ok: false };
  }
}

export function parseHardwareForm(fd: FormData): ParseResult<HardwareInsert> {
  const errors: Record<string, string> = {};

  const name = str(fd, "name");
  if (name === "") errors.name = "Nom obligatoire.";

  const slugRaw = str(fd, "slug");
  const slug = slugRaw === "" ? slugify(name) : slugRaw;
  if (slug === "") errors.slug = "Slug invalide.";
  else if (!isValidSlug(slug))
    errors.slug = "Slug : minuscules, chiffres et tirets uniquement.";

  const useCase = str(fd, "use_case");
  if (useCase === "") errors.use_case = "Cas d'usage obligatoire.";

  const priceRaw = str(fd, "total_price_eur");
  const totalPriceEur = Number.parseFloat(priceRaw === "" ? "0" : priceRaw);
  if (!Number.isFinite(totalPriceEur) || totalPriceEur < 0)
    errors.total_price_eur = "Prix invalide.";

  const bomRes = parseBom(str(fd, "bom"));
  if (!bomRes.ok)
    errors.bom = "BOM invalide. Attendu : tableau JSON avec part/model/price_eur.";

  const purchaseUrl = strOrNull(fd, "purchase_url");
  if (purchaseUrl !== null && !URL_REGEX.test(purchaseUrl))
    errors.purchase_url = "URL invalide.";

  const statusRaw = str(fd, "status");
  if (!(STATUSES as readonly string[]).includes(statusRaw))
    errors.status = "Statut invalide.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      slug,
      name,
      use_case: useCase,
      description: strOrNull(fd, "description"),
      bom: bomRes.ok ? bomRes.value : [],
      total_price_eur: totalPriceEur,
      purchase_url: purchaseUrl,
      installer_notes: strOrNull(fd, "installer_notes"),
      status: statusRaw as ComponentStatus,
    },
  };
}
