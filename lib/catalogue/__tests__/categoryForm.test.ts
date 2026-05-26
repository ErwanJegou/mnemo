import { describe, expect, it } from "vitest";
import { parseCategoryForm } from "@/lib/catalogue/categoryForm";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

describe("parseCategoryForm", () => {
  it("retourne un Insert valide avec champs minimaux", () => {
    const r = parseCategoryForm(fd({ name: "Stockage vectoriel", rank: "storage", position: "2" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.slug).toBe("stockage-vectoriel");
      expect(r.data.rank).toBe("storage");
      expect(r.data.position).toBe(2);
    }
  });

  it("rejette un rang invalide", () => {
    const r = parseCategoryForm(fd({ name: "X", rank: "godmode", position: "1" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.rank).toBeDefined();
  });

  it("rejette une position négative", () => {
    const r = parseCategoryForm(fd({ name: "X", rank: "ingest", position: "-1" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.position).toBeDefined();
  });

  it("respecte un slug fourni", () => {
    const r = parseCategoryForm(fd({ name: "Stockage vectoriel", slug: "vec", rank: "storage", position: "1" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.slug).toBe("vec");
  });
});
