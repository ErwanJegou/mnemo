import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/catalogue/labels";

describe("formatPrice", () => {
  it("retourne 'Gratuit' pour pricing_model=free", () => {
    expect(formatPrice(0, "mois", "free")).toBe("Gratuit");
    expect(formatPrice(123, "mois", "free")).toBe("Gratuit");
  });

  it("retourne 'Sur devis' pour pricing_model=contact", () => {
    expect(formatPrice(0, "mois", "contact")).toBe("Sur devis");
    expect(formatPrice(999, "mois", "contact")).toBe("Sur devis");
  });

  it("retourne 'Self-hosted (+ infra)' pour pricing_model=self_host et masque le montant", () => {
    // Le logiciel est gratuit ; le montant saisi représente l'infra et n'est
    // pas affiché ici (l'infra est modélisée séparément via infra_targets).
    expect(formatPrice(0, "mois", "self_host")).toBe("Self-hosted (+ infra)");
    expect(formatPrice(20, "mois", "self_host")).toBe("Self-hosted (+ infra)");
  });

  it("formate un forfait flat avec son unité", () => {
    // Intl.NumberFormat fr-FR utilise des espaces insécables, on vérifie
    // par contenu plutôt que par égalité stricte.
    const out = formatPrice(25, "mois", "flat");
    expect(out).toMatch(/25/);
    expect(out).toMatch(/€/);
    expect(out).toMatch(/mois$/);
  });

  it("formate un coût à l'usage avec son unité", () => {
    expect(formatPrice(0.003, "image", "usage")).toContain("image");
  });

  it("retourne '0 €/unit' pour un montant nul (sauf self_host/free/contact)", () => {
    expect(formatPrice(0, "mois", "flat")).toBe("0 €/mois");
  });
});
