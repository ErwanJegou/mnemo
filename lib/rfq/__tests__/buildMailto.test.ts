import { describe, expect, it } from "vitest";
import { buildRfq, defaultRfqBody } from "@/lib/rfq/buildMailto";
import type { ComponentRow, VendorRow } from "@/lib/supabase/types";

const VENDOR_BASE: Pick<VendorRow, "name" | "contact_email" | "contact_form_url" | "sovereignty_zone"> = {
  name: "Mistral AI",
  contact_email: "sales@mistral.ai",
  contact_form_url: null,
  sovereignty_zone: "eu",
};

const COMPONENT_BASE: Pick<ComponentRow, "name" | "tier" | "layer_id" | "rfq_template" | "pricing_url"> = {
  name: "Mistral embed API",
  tier: "API",
  layer_id: 4,
  rfq_template: null,
  pricing_url: "https://mistral.ai/pricing",
};

describe("defaultRfqBody", () => {
  it("compose le sujet avec vendor + composant", () => {
    const { subject } = defaultRfqBody({ vendor: VENDOR_BASE, component: COMPONENT_BASE });
    expect(subject).toBe("Demande de prix — Mistral AI · Mistral embed API");
  });

  it("inclut le tier entre parenthèses", () => {
    const { body } = defaultRfqBody({ vendor: VENDOR_BASE, component: COMPONENT_BASE });
    expect(body).toContain("Mistral embed API (API)");
  });

  it("affiche un bloc contexte si profil fourni", () => {
    const { body } = defaultRfqBody({
      vendor: VENDOR_BASE,
      component: COMPONENT_BASE,
      profile: { volume: "1-10 Go", regulation: "RGPD", zone: "UE" },
    });
    expect(body).toContain("Contexte d'usage envisagé");
    expect(body).toContain("Volume de données : 1-10 Go");
    expect(body).toContain("Régulation : RGPD");
  });

  it("omet le bloc contexte si pas de profil ou profil vide", () => {
    expect(
      defaultRfqBody({ vendor: VENDOR_BASE, component: COMPONENT_BASE }).body,
    ).not.toContain("Contexte d'usage envisagé");
    expect(
      defaultRfqBody({ vendor: VENDOR_BASE, component: COMPONENT_BASE, profile: {} }).body,
    ).not.toContain("Contexte d'usage envisagé");
  });

  it("signe avec le nom et l'URL par défaut", () => {
    const { body } = defaultRfqBody({ vendor: VENDOR_BASE, component: COMPONENT_BASE });
    expect(body).toContain("Erwan Jégou — Mnémo");
    expect(body).toContain("https://erwanjegou.com");
  });

  it("permet d'override l'expéditeur", () => {
    const { body } = defaultRfqBody({
      vendor: VENDOR_BASE,
      component: COMPONENT_BASE,
      fromName: "Test User",
      fromUrl: "https://example.com",
    });
    expect(body).toContain("Test User");
    expect(body).toContain("https://example.com");
  });
});

describe("buildRfq", () => {
  it("retourne un mailto: bien encodé quand le vendor a un email", () => {
    const out = buildRfq({ vendor: VENDOR_BASE, component: COMPONENT_BASE });
    expect(out.kind).toBe("mailto");
    if (out.kind === "mailto") {
      expect(out.href).toMatch(/^mailto:sales@mistral\.ai\?/u);
      expect(out.href).toContain("subject=Demande");
      // Espaces encodés en %20 (pas en +) pour compatibilité mailto:
      expect(out.href).not.toContain("subject=Demande+");
      expect(out.href).toContain("body=");
    }
  });

  it("retourne contact_form si pas d'email mais une URL", () => {
    const out = buildRfq({
      vendor: { ...VENDOR_BASE, contact_email: null, contact_form_url: "https://x.io/contact" },
      component: COMPONENT_BASE,
    });
    expect(out).toEqual({ kind: "contact_form", href: "https://x.io/contact" });
  });

  it("retourne none si rien n'est renseigné", () => {
    const out = buildRfq({
      vendor: { ...VENDOR_BASE, contact_email: null, contact_form_url: null },
      component: COMPONENT_BASE,
    });
    expect(out.kind).toBe("none");
  });

  it("utilise rfq_template custom du composant si défini", () => {
    const out = buildRfq({
      vendor: VENDOR_BASE,
      component: {
        ...COMPONENT_BASE,
        rfq_template: "Salut, je veux {component} chez {vendor} sur {layer}.",
      },
    });
    expect(out.kind).toBe("mailto");
    if (out.kind === "mailto") {
      const body = decodeURIComponent(out.href.split("body=")[1]);
      expect(body).toContain("Mistral embed API");
      expect(body).toContain("Mistral AI");
      expect(body).toContain("C4");
    }
  });
});
