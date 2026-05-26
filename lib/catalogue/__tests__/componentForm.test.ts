import { describe, expect, it } from "vitest";
import { parseComponentForm } from "@/lib/catalogue/componentForm";

const VENDOR_ID = "11111111-1111-1111-1111-111111111111";
const CATEGORY_ID = "22222222-2222-2222-2222-222222222222";
const PORT_IN_ID = "33333333-3333-3333-3333-333333333333";
const PORT_OUT_ID = "44444444-4444-4444-4444-444444444444";
const INFRA_ID = "55555555-5555-5555-5555-555555555555";

const KNOWN = {
  vendors: new Set([VENDOR_ID]),
  categories: new Set([CATEGORY_ID]),
  portTypes: new Set([PORT_IN_ID, PORT_OUT_ID]),
  infraTargets: new Set([INFRA_ID]),
};

function fd(entries: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (Array.isArray(v)) for (const item of v) f.append(k, item);
    else f.append(k, v);
  }
  return f;
}

function valid(extra: Record<string, string | string[]> = {}): FormData {
  return fd({
    vendor_id: VENDOR_ID,
    layer_id: "3",
    slug: "c3-test-qdrant",
    name: "Qdrant test",
    pricing_model: "flat",
    base_price_eur: "25",
    unit: "mois",
    confidence: "high",
    status: "validated",
    ...extra,
  });
}

describe("parseComponentForm", () => {
  it("retourne un Insert valide avec champs minimaux", () => {
    const r = parseComponentForm(valid(), KNOWN);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.component.vendor_id).toBe(VENDOR_ID);
      expect(r.data.component.layer_id).toBe(3);
      expect(r.data.component.slug).toBe("c3-test-qdrant");
      expect(r.data.component.base_price_eur).toBe(25);
      expect(r.data.component.preset_fit).toEqual([]);
      expect(r.data.component.capabilities).toEqual({});
      expect(r.data.component.category_id).toBeNull();
      expect(r.data.portInIds).toEqual([]);
      expect(r.data.portOutIds).toEqual([]);
      expect(r.data.infraTargetIds).toEqual([]);
    }
  });

  it("erreur si vendor inconnu", () => {
    const r = parseComponentForm(
      valid({ vendor_id: "00000000-0000-0000-0000-000000000000" }),
      KNOWN,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.vendor_id).toBeDefined();
  });

  it("erreur si layer hors plage", () => {
    const r = parseComponentForm(valid({ layer_id: "7" }), KNOWN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.layer_id).toBeDefined();
  });

  it("erreur si slug mal formé", () => {
    const r = parseComponentForm(valid({ slug: "BadSlug!" }), KNOWN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.slug).toBeDefined();
  });

  it("erreur si prix négatif", () => {
    const r = parseComponentForm(valid({ base_price_eur: "-5" }), KNOWN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.base_price_eur).toBeDefined();
  });

  it("accepte multi-presets", () => {
    const r = parseComponentForm(
      valid({ preset_fit: ["light", "medium"] }),
      KNOWN,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.component.preset_fit).toEqual(["light", "medium"]);
  });

  it("rejette un preset inconnu", () => {
    const r = parseComponentForm(
      valid({ preset_fit: ["light", "ultra"] }),
      KNOWN,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.preset_fit).toBeDefined();
  });

  it("parse les capabilities en JSON objet", () => {
    const r = parseComponentForm(
      valid({ capabilities: '{"on_prem":true,"open_source":true}' }),
      KNOWN,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.component.capabilities).toEqual({ on_prem: true, open_source: true });
    }
  });

  it("rejette capabilities = tableau", () => {
    const r = parseComponentForm(valid({ capabilities: '["a","b"]' }), KNOWN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.capabilities).toBeDefined();
  });

  it("rejette JSON invalide", () => {
    const r = parseComponentForm(valid({ capabilities: "{not json}" }), KNOWN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.capabilities).toBeDefined();
  });

  it("rejette une date non ISO", () => {
    const r = parseComponentForm(valid({ last_checked_at: "23 mai 2026" }), KNOWN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.last_checked_at).toBeDefined();
  });

  it("accepte une date ISO", () => {
    const r = parseComponentForm(valid({ last_checked_at: "2026-05-23" }), KNOWN);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.component.last_checked_at).toBe("2026-05-23");
  });

  it("rejette confiance et statut invalides", () => {
    const r = parseComponentForm(
      valid({ confidence: "très haute", status: "publié" }),
      KNOWN,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.confidence).toBeDefined();
      expect(r.errors.status).toBeDefined();
    }
  });

  it("accepte une catégorie valide", () => {
    const r = parseComponentForm(valid({ category_id: CATEGORY_ID }), KNOWN);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.component.category_id).toBe(CATEGORY_ID);
  });

  it("rejette une catégorie inconnue", () => {
    const r = parseComponentForm(valid({ category_id: "deadbeef-0000-0000-0000-000000000000" }), KNOWN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.category_id).toBeDefined();
  });

  it("accepte les ports in/out et l'infra", () => {
    const r = parseComponentForm(
      valid({
        port_in: [PORT_IN_ID],
        port_out: [PORT_OUT_ID],
        infra_targets: [INFRA_ID],
      }),
      KNOWN,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.portInIds).toEqual([PORT_IN_ID]);
      expect(r.data.portOutIds).toEqual([PORT_OUT_ID]);
      expect(r.data.infraTargetIds).toEqual([INFRA_ID]);
    }
  });

  it("rejette un port inconnu", () => {
    const r = parseComponentForm(
      valid({ port_in: ["unknown-id"] }),
      KNOWN,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.ports).toBeDefined();
  });

  it("rejette une infra inconnue", () => {
    const r = parseComponentForm(
      valid({ infra_targets: ["unknown-id"] }),
      KNOWN,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.infra_targets).toBeDefined();
  });
});
