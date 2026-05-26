import { describe, expect, it } from "vitest";
import { parsePortTypeForm } from "@/lib/catalogue/portTypeForm";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

describe("parsePortTypeForm", () => {
  it("accepte un slug family/specific", () => {
    const r = parsePortTypeForm(
      fd({ name: "Embedding dense", family: "embedding", slug: "embedding/dense" }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.slug).toBe("embedding/dense");
      expect(r.data.family).toBe("embedding");
    }
  });

  it("accepte un slug simple sans slash", () => {
    const r = parsePortTypeForm(fd({ name: "Pixels", family: "image", slug: "raw-pixels" }));
    expect(r.ok).toBe(true);
  });

  it("rejette un slug avec majuscule", () => {
    const r = parsePortTypeForm(fd({ name: "X", family: "embedding", slug: "Embedding/Dense" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.slug).toBeDefined();
  });

  it("rejette un slug à deux slashes", () => {
    const r = parsePortTypeForm(fd({ name: "X", family: "a", slug: "a/b/c" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.slug).toBeDefined();
  });

  it("rejette une famille avec espaces", () => {
    const r = parsePortTypeForm(fd({ name: "X", family: "my family", slug: "x/y" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.family).toBeDefined();
  });
});
