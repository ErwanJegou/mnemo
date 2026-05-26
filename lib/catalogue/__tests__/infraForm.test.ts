import { describe, expect, it } from "vitest";
import { parseInfraForm } from "@/lib/catalogue/infraForm";

const VENDOR_ID = "11111111-1111-1111-1111-111111111111";
const KNOWN = { vendors: new Set([VENDOR_ID]) };

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

function valid(extra: Record<string, string> = {}): FormData {
  return fd({
    name: "Hetzner CX22",
    infra_kind: "vps_managed",
    sovereignty_zone: "eu",
    base_price_eur: "4.59",
    unit: "mois",
    confidence: "high",
    status: "validated",
    ...extra,
  });
}

describe("parseInfraForm", () => {
  it("retourne un Insert valide avec champs minimaux", () => {
    const r = parseInfraForm(valid(), KNOWN);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.slug).toBe("hetzner-cx22");
      expect(r.data.infra_kind).toBe("vps_managed");
      expect(r.data.base_price_eur).toBe(4.59);
      expect(r.data.specs).toEqual({});
      expect(r.data.vendor_id).toBeNull();
    }
  });

  it("rejette un kind invalide", () => {
    const r = parseInfraForm(valid({ infra_kind: "cloud_magique" }), KNOWN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.infra_kind).toBeDefined();
  });

  it("rejette un vendor inconnu", () => {
    const r = parseInfraForm(
      valid({ vendor_id: "00000000-0000-0000-0000-000000000000" }),
      KNOWN,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.vendor_id).toBeDefined();
  });

  it("accepte un vendor valide", () => {
    const r = parseInfraForm(valid({ vendor_id: VENDOR_ID }), KNOWN);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.vendor_id).toBe(VENDOR_ID);
  });

  it("parse les specs en JSON", () => {
    const r = parseInfraForm(valid({ specs: '{"cpu_vcpu":2,"ram_gb":4}' }), KNOWN);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.specs).toEqual({ cpu_vcpu: 2, ram_gb: 4 });
  });

  it("rejette des specs en tableau", () => {
    const r = parseInfraForm(valid({ specs: '["a"]' }), KNOWN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.specs).toBeDefined();
  });
});
