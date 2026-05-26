// lib/catalogue/__tests__/solutionForm.test.ts
import { describe, expect, it } from "vitest";
import { parseSolutionForm } from "@/lib/catalogue/solutionForm";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

function valid(extra: Record<string, string> = {}): FormData {
  return fd({
    title: "Test",
    slug: "test-solution",
    problem_statement: "Un problème",
    complexity: "easy",
    status: "draft",
    position: "0",
    ...extra,
  });
}

describe("parseSolutionForm — volume_assumptions", () => {
  it("retourne un objet vide si pas de champ", () => {
    const r = parseSolutionForm(valid());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.volume_assumptions).toEqual({});
  });

  it("parse un JSON valide", () => {
    const r = parseSolutionForm(
      valid({ volume_assumptions: '{"image_per_month": 1000}' }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.volume_assumptions).toEqual({ image_per_month: 1000 });
  });

  it("rejette un JSON malformé", () => {
    const r = parseSolutionForm(valid({ volume_assumptions: "{not json" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.volume_assumptions).toBeDefined();
  });

  it("rejette un JSON qui n'est pas un objet", () => {
    const r = parseSolutionForm(valid({ volume_assumptions: "[1,2,3]" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.volume_assumptions).toBeDefined();
  });

  it("rejette des valeurs non numériques", () => {
    const r = parseSolutionForm(
      valid({ volume_assumptions: '{"image_per_month": "mille"}' }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.volume_assumptions).toBeDefined();
  });

  it("rejette des valeurs négatives", () => {
    const r = parseSolutionForm(
      valid({ volume_assumptions: '{"image_per_month": -10}' }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.volume_assumptions).toBeDefined();
  });
});
