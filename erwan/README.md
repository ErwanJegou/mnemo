---
date: 2026-05-26
auteur: Erwan Jégou + Claude
type: index
sujet: Documentation Mnémo — session 2026-05-25/26
statut: référence-de-travail
---

# Documentation Mnémo — session 2026-05-25/26

> **Index** de tout ce qui a été conçu et livré durant la session
> du 25-26 mai 2026 sur le projet Mnémo.
> **Périmètre** : refonte du configurateur en plateforme orientée problème
> avec catalogue éditable (briques + vendors + infra + hardware + ports +
> solutions + ratings).

---

## Lire dans cet ordre

| # | Fichier | Quoi | Quand le lire |
|---|---|---|---|
| 1 | [`2026-05-26_fiche_erwan_mnemo-vue-densemble.md`](./2026-05-26_fiche_erwan_mnemo-vue-densemble.md) | État du projet, métriques, accès rapides | En premier — vue 360° en 2 minutes |
| 2 | [`2026-05-26_methode_erwan_mnemo-pivots-conceptuels.md`](./2026-05-26_methode_erwan_mnemo-pivots-conceptuels.md) | Les 3 pivots qu'on a faits dans la session | Pour comprendre *pourquoi* l'archi actuelle |
| 3 | [`2026-05-26_fiche_erwan_mnemo-architecture-data.md`](./2026-05-26_fiche_erwan_mnemo-architecture-data.md) | Modèle data Supabase (12 tables, relations) | Pour modifier le schéma ou seeder |
| 4 | [`2026-05-26_fiche_erwan_mnemo-solutions-seedees.md`](./2026-05-26_fiche_erwan_mnemo-solutions-seedees.md) | Les 4 solutions seedées (workflow par workflow) | Pour ajouter ou modifier une solution |
| 5 | [`2026-05-26_fiche_erwan_mnemo-routes.md`](./2026-05-26_fiche_erwan_mnemo-routes.md) | Toutes les routes publiques + admin | Pour naviguer dans l'app |
| 6 | [`2026-05-26_strategie_erwan_mnemo-prochaines-etapes.md`](./2026-05-26_strategie_erwan_mnemo-prochaines-etapes.md) | Lot 2, dette et roadmap | Pour décider du prochain chantier |

---

## Métriques de la session

| Indicateur | Valeur |
|---|---|
| Stories livrées | 18 (6 catalogue + 6 taxonomie + 6 solutions) |
| Migrations Supabase | 3 (rails → catalogue → taxonomie → solutions) |
| Tables BDD | 12 dont 3 multi-tenant + 9 catalogue/solutions |
| Routes Next.js compilées | 31 (8 publiques, 23 admin) |
| Tests Vitest | 178 (+25 nouveaux sur les parsers du catalogue) |
| Lignes de code TypeScript | environ 3 500 ajoutées |

---

## Convention de cette doc

Format **fiche Erwan** standard : frontmatter YAML, sections numérotées,
tableaux comparatifs, ton factuel, pas d'emoji dans les titres, pas de fluff
marketing. Voir `~/.claude/skills/fiche-erwan-md/SKILL.md`.

---

## À retenir en une phrase

> **Mnémo est passé de "configurateur 7 couches preset" à
> "plateforme catalogue + solutions orientées problème" — sans casser
> l'existant (le wizard reste vivant en mode sur mesure).**
