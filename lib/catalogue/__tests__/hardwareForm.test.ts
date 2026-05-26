import { describe, expect, it } from "vitest";
import { parseHardwareForm } from "@/lib/catalogue/hardwareForm";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

function valid(extra: Record<string, string> = {}): FormData {
  return fd({
    name: "Pack RAG perso",
    use_case: "RAG individuel CPU",
    total_price_eur: "700",
    status: "validated",
    ...extra,
  });
}

describe("parseHardwareForm", () => {
  it("retourne un Insert valide avec champs minimaux", () => {
    const r = parseHardwareForm(valid());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.slug).toBe("pack-rag-perso");
      expect(r.data.total_price_eur).toBe(700);
      expect(r.data.bom).toEqual([]);
    }
  });

  it("parse une BOM valide", () => {
    const bom = JSON.stringify([
      { part: "Mini-PC", model: "Beelink SER7", price_eur: 600, vendor: "Beelink" },
      { part: "SSD", model: "Crucial P3", price_eur: 100 },
    ]);
    const r = parseHardwareForm(valid({ bom }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.bom).toHaveLength(2);
      expect(r.data.bom[0]?.model).toBe("Beelink SER7");
      expect(r.data.bom[0]?.vendor).toBe("Beelink");
    }
  });

  it("rejette une BOM sans price_eur", () => {
    const r = parseHardwareForm(valid({ bom: '[{"part":"x","model":"y"}]' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.bom).toBeDefined();
  });

  it("rejette une BOM qui n'est pas un tableau", () => {
    const r = parseHardwareForm(valid({ bom: '{"not":"array"}' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.bom).toBeDefined();
  });

  it("rejette un purchase_url non https", () => {
    const r = parseHardwareForm(valid({ purchase_url: "ftp://x" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.purchase_url).toBeDefined();
  });
});
