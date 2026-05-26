import { describe, expect, it } from "vitest";
import { parseVendorForm } from "@/lib/catalogue/vendorForm";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

describe("parseVendorForm", () => {
  it("retourne un VendorInsert valide sur saisie minimale", () => {
    const res = parseVendorForm(
      fd({ name: "Mistral AI", sovereignty_zone: "eu" }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.name).toBe("Mistral AI");
      expect(res.data.slug).toBe("mistral-ai");
      expect(res.data.sovereignty_zone).toBe("eu");
      expect(res.data.country).toBeNull();
      expect(res.data.website).toBeNull();
      expect(res.data.contact_email).toBeNull();
      expect(res.data.contact_form_url).toBeNull();
      expect(res.data.notes).toBeNull();
    }
  });

  it("erreur si nom manquant", () => {
    const res = parseVendorForm(fd({ sovereignty_zone: "eu" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.name).toBeDefined();
  });

  it("erreur si zone invalide", () => {
    const res = parseVendorForm(fd({ name: "X", sovereignty_zone: "lunaire" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.sovereignty_zone).toBeDefined();
  });

  it("respecte un slug fourni explicitement", () => {
    const res = parseVendorForm(
      fd({ name: "Mistral AI", slug: "mistralai-fr", sovereignty_zone: "eu" }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.slug).toBe("mistralai-fr");
  });

  it("rejette un slug mal formé", () => {
    const res = parseVendorForm(
      fd({ name: "X", slug: "FOO BAR", sovereignty_zone: "eu" }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.slug).toBeDefined();
  });

  it("rejette une URL website invalide", () => {
    const res = parseVendorForm(
      fd({ name: "X", sovereignty_zone: "eu", website: "not-a-url" }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.website).toBeDefined();
  });

  it("rejette un email contact invalide", () => {
    const res = parseVendorForm(
      fd({ name: "X", sovereignty_zone: "eu", contact_email: "pasunemail" }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.contact_email).toBeDefined();
  });

  it("accepte une saisie complète", () => {
    const res = parseVendorForm(
      fd({
        name: "Test Co",
        slug: "test-co",
        country: "FR",
        sovereignty_zone: "eu",
        website: "https://test.co",
        contact_email: "hi@test.co",
        contact_form_url: "https://test.co/contact",
        notes: "Note libre.",
      }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.country).toBe("FR");
      expect(res.data.website).toBe("https://test.co");
      expect(res.data.contact_email).toBe("hi@test.co");
      expect(res.data.contact_form_url).toBe("https://test.co/contact");
      expect(res.data.notes).toBe("Note libre.");
    }
  });
});
