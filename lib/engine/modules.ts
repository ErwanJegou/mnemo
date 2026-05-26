import type { EngineModule, ModuleId, Preset } from "./types";

// Modules avancés (sliders d'intensité). Variables d'entrée du configurateur :
// ils ajustent coût + scoring + plan d'action, sans que la plateforme implémente
// ces features de la base mémorielle du client (cf. PRD §5, angle mort A5).
// Vocabulaire vulgarisé (matrice docs/wizard-refonte-matrix.html) — `id` stable.
export const MODULES: readonly EngineModule[] = [
  {
    id: "bisect",
    name: "Retrouver depuis quand votre pensée a évolué",
    why: "« À partir de quand est-ce que je pensais autrement sur ce sujet ? » Utile aux consultants, formateurs et experts qui voient leur doctrine évoluer dans le temps.",
    layers: "C5 + UI",
    effort: "M",
    costFull: 10,
    maxLevel: 3,
    bonusFull: { audit: 1, adapt: 1 },
    levels: [
      { label: "Désactivé", desc: "Recherche dans l'historique classique." },
      {
        label: "Manuel",
        desc: "Vous naviguez vous-même dans l'historique pour retrouver le moment du changement.",
      },
      {
        label: "Assisté",
        desc: "L'IA propose des moments candidats, vous validez à chaque étape.",
      },
      {
        label: "Automatique",
        desc: "L'IA fait toute la recherche et vous donne directement le moment du changement.",
      },
    ],
    baseTask:
      "Implémenter l'opération bisect dans la couche C5 : sélectionner deux atomes (good/bad) sur un même concept, le système propose les atomes pivots à examiner par dichotomie.",
  },
  {
    id: "reversal",
    name: "Corrections tracées au lieu d'écrasement",
    why: "Quand vous corrigez une info, l'ancienne version reste visible avec l'étiquette « corrigé ». Précieux pour les métiers où la traçabilité est obligatoire (audit, compliance, santé, juridique).",
    layers: "C0 + C5 + C2",
    effort: "S",
    costFull: 5,
    maxLevel: 3,
    bonusFull: { audit: 2 },
    levels: [
      { label: "Désactivé", desc: "Les corrections écrasent l'original (comportement standard)." },
      {
        label: "Étiquette logique",
        desc: "Chaque correction porte une étiquette « corrigé » ; l'historique reste lisible.",
      },
      {
        label: "Signature cryptographique",
        desc: "Chaque correction est signée — preuve qu'elle n'a pas été falsifiée après coup.",
      },
      {
        label: "Registre chaîné",
        desc: "Toutes les corrections forment une chaîne inviolable (style registre comptable certifié).",
      },
    ],
    baseTask:
      "Ajouter le type `reversal` au frontmatter + signature crypto sur l'atome de reversal + filtre par défaut dans l'orchestrateur.",
  },
  {
    id: "prereg",
    name: "S'engager sur une hypothèse avant la décision",
    why: "Méthode utilisée en science, audit et qualité : on écrit AVANT « voici mon hypothèse et mon critère de succès ». Empêche de se mentir à soi-même après coup (biais de confirmation).",
    layers: "C0 + C2",
    effort: "S",
    costFull: 0,
    maxLevel: 3,
    bonusFull: { stress: 1, conf: 1 },
    levels: [
      { label: "Désactivé", desc: "Pas d'engagement pré-décision." },
      {
        label: "Recommandé",
        desc: "L'engagement écrit est optionnel, juste rappelé dans la documentation.",
      },
      {
        label: "Tracé",
        desc: "Quand vous faites un postmortem, l'engagement initial est rappelé automatiquement.",
      },
      {
        label: "Obligatoire",
        desc: "Aucune décision structurante ne passe sans engagement écrit préalable, vérifié au postmortem.",
      },
    ],
    baseTask: "Ajouter type `pre_reg` au schéma + workflow décision → postmortem qui le référence.",
  },
  {
    id: "mel",
    name: "Plan de continuité en cas de panne",
    why: "« Que faire si ce composant tombe ? » écrit AVANT l'incident, pas improvisé pendant. Méthode inspirée de la Minimum Equipment List des compagnies aériennes.",
    layers: "C6 + runbook + monitoring",
    effort: "M",
    costFull: 30,
    maxLevel: 4,
    bonusFull: { sov: 1, conf: 1 },
    levels: [
      { label: "Désactivé", desc: "Procédure minimale. Improvisation en cas de panne." },
      { label: "Rédigé", desc: "Plan écrit pour les composants critiques uniquement." },
      {
        label: "Testé",
        desc: "Plan + test annuel : on coupe vraiment le composant pour vérifier que le mode dégradé marche.",
      },
      {
        label: "Monitoré",
        desc: "Plan + monitoring qui détecte la panne et bascule automatiquement en mode dégradé.",
      },
      {
        label: "Certifié",
        desc: "Tout ce qui précède + revue annuelle de la matrice + audit trail complet.",
      },
    ],
    baseTask: "Rédiger la MEL : matrice composants × types panne × délai max × procédure alternative.",
  },
  {
    id: "conflict",
    name: "Détection automatique de conflits d'intérêts",
    why: "Avant de conseiller un client sur un sujet, vérifier automatiquement si ce sujet touche un client adversaire, un concurrent ou une décision déjà prise ailleurs. Empêche le conseil contradictoire.",
    layers: "C0 + C2 + C5",
    effort: "M",
    costFull: 50,
    maxLevel: 4,
    bonusFull: { conf: 2, adapt: 1 },
    levels: [
      { label: "Désactivé", desc: "Aucune vérification automatique." },
      {
        label: "Nom à nom",
        desc: "Détection par correspondance exacte du nom de l'entité (personne, entreprise).",
      },
      {
        label: "Avec variantes",
        desc: "Détection même si le nom est écrit différemment (variantes orthographiques, abréviations, alias).",
      },
      {
        label: "+ Historique",
        desc: "Détection + vérification : « cette entité a-t-elle été dans un autre contexte auparavant ? »",
      },
      {
        label: "+ Multi-client",
        desc: "Détection croisée entre tous vos dossiers clients (alerte automatique cross-client).",
      },
    ],
    baseTask:
      "NER (spaCy ou Gliner local) sur l'ingestion + index entités + check pre-query orchestrateur.",
  },
];

/**
 * Niveaux par défaut des modules pour un preset donné (matrice C de la spec).
 * Sans preset → tout à 0 (= utilisateur décide activement, plus de défaut « tout au max »
 * hérité du simulateur HTML).
 */
export function defaultModuleLevels(preset?: Preset): Record<ModuleId, number> {
  switch (preset) {
    case "LIGHT":
      return { bisect: 0, reversal: 0, prereg: 0, mel: 0, conflict: 0 };
    case "MEDIUM":
      return { bisect: 1, reversal: 1, prereg: 1, mel: 1, conflict: 0 };
    case "HARD":
      return { bisect: 2, reversal: 3, prereg: 2, mel: 2, conflict: 2 };
    default:
      return { bisect: 0, reversal: 0, prereg: 0, mel: 0, conflict: 0 };
  }
}
