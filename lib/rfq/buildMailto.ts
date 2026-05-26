// Construit un lien mailto: pour demander un prix à un vendor sur un composant.
// Pas de stockage en BDD au Lot 1 : l'admin clique → son client mail s'ouvre
// avec un brouillon pré-rempli, à lui d'envoyer.

import { LAYER_NAMES, SOVEREIGNTY_LABELS } from "@/lib/catalogue/labels";
import type { ComponentRow, VendorRow } from "@/lib/supabase/types";

export type RfqProfileContext = {
  volume?: string;
  regulation?: string;
  zone?: string;
  sensitivity?: string;
  contentTypes?: string;
  budget?: string;
};

export type RfqInput = {
  component: Pick<ComponentRow, "name" | "tier" | "layer_id" | "rfq_template" | "pricing_url">;
  vendor: Pick<VendorRow, "name" | "contact_email" | "contact_form_url" | "sovereignty_zone">;
  profile?: RfqProfileContext;
  /** Adresse expéditrice à signer (rendue dans le corps, pas dans From). */
  fromName?: string;
  fromUrl?: string;
};

export type RfqOutcome =
  | { kind: "mailto"; href: string }
  | { kind: "contact_form"; href: string }
  | { kind: "none"; reason: string };

const DEFAULT_FROM_NAME = "Erwan Jégou — Mnémo";
const DEFAULT_FROM_URL = "https://erwanjegou.com";

/** Décrit le contexte d'usage en bullets, ou chaîne vide si pas de profil. */
function formatContextBlock(profile: RfqProfileContext | undefined): string {
  if (profile === undefined) return "";
  const lines: string[] = [];
  if (profile.volume) lines.push(`- Volume de données : ${profile.volume}`);
  if (profile.regulation) lines.push(`- Régulation : ${profile.regulation}`);
  if (profile.zone) lines.push(`- Zone géographique : ${profile.zone}`);
  if (profile.sensitivity) lines.push(`- Sensibilité : ${profile.sensitivity}`);
  if (profile.contentTypes) lines.push(`- Types de contenu : ${profile.contentTypes}`);
  if (profile.budget) lines.push(`- Budget mensuel cible : ${profile.budget}`);
  if (lines.length === 0) return "";
  return `\n\nContexte d'usage envisagé :\n${lines.join("\n")}`;
}

/** Sujet et corps standard si aucun rfq_template custom n'est défini. */
export function defaultRfqBody(input: RfqInput): { subject: string; body: string } {
  const { component, vendor, profile } = input;
  const fromName = input.fromName ?? DEFAULT_FROM_NAME;
  const fromUrl = input.fromUrl ?? DEFAULT_FROM_URL;
  const tierSuffix = component.tier !== null && component.tier !== "" ? ` (${component.tier})` : "";
  const layerName = LAYER_NAMES[component.layer_id] ?? `Couche ${component.layer_id}`;

  const subject = `Demande de prix — ${vendor.name} · ${component.name}`;

  const body =
    `Bonjour,\n\n` +
    `Je suis ${fromName} (${fromUrl}). Je construis Mnémo, un configurateur ` +
    `d'infrastructure de base mémorielle IA souveraine pour cabinets régulés, ` +
    `freelances et PME en zone ${SOVEREIGNTY_LABELS[vendor.sovereignty_zone]}.\n\n` +
    `Je souhaite intégrer ${component.name}${tierSuffix} (${vendor.name}) dans la couche\n` +
    `${layerName} de notre stack de référence.` +
    formatContextBlock(profile) +
    `\n\nPourriez-vous me confirmer :\n` +
    `1. Le prix actuel de ${component.name}${tierSuffix} pour ce profil\n` +
    `2. Les conditions de volume / engagement (mensuel, annuel, paliers)\n` +
    `3. Le contact commercial dédié pour ouvrir une discussion\n\n` +
    `Merci d'avance.\n\n` +
    `${fromName}\n${fromUrl}`;

  return { subject, body };
}

/** Substitution rudimentaire des placeholders {vendor}, {component}, {tier}, {layer} d'un template custom. */
function applyTemplate(template: string, input: RfqInput): string {
  const { component, vendor } = input;
  const layerName = LAYER_NAMES[component.layer_id] ?? `Couche ${component.layer_id}`;
  return template
    .replace(/\{vendor\}/gu, vendor.name)
    .replace(/\{component\}/gu, component.name)
    .replace(/\{tier\}/gu, component.tier ?? "")
    .replace(/\{layer\}/gu, layerName);
}

/**
 * Retourne le moyen de contact à utiliser :
 *  - 'mailto' si le vendor a un email,
 *  - 'contact_form' si seul un formulaire web est disponible (fallback),
 *  - 'none' sinon, avec une raison.
 */
export function buildRfq(input: RfqInput): RfqOutcome {
  const { vendor, component } = input;

  if (vendor.contact_email !== null && vendor.contact_email !== "") {
    const { subject, body } = defaultRfqBody(input);
    const customBody =
      component.rfq_template !== null && component.rfq_template !== ""
        ? applyTemplate(component.rfq_template, input)
        : body;
    const params = new URLSearchParams({ subject, body: customBody });
    // URLSearchParams remplace les espaces par '+', mailto: attend %20 — on corrige.
    const query = params.toString().replace(/\+/gu, "%20");
    return { kind: "mailto", href: `mailto:${vendor.contact_email}?${query}` };
  }

  if (vendor.contact_form_url !== null && vendor.contact_form_url !== "") {
    return { kind: "contact_form", href: vendor.contact_form_url };
  }

  return {
    kind: "none",
    reason: "Aucun e-mail ni formulaire de contact renseigné pour ce vendor.",
  };
}
