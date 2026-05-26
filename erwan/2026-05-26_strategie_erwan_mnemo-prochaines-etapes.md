---
date: 2026-05-26
auteur: Erwan Jégou + Claude
type: strategie
sujet: Mnémo — prochaines étapes (Lot 2 et au-delà)
statut: décision-à-arbitrer
tags: [mnemo, roadmap, lot-2, priorisation]
---

# Mnémo — prochaines étapes

> **Quoi** : ce qui reste à faire après la session 25-26 mai 2026.
> Liste exhaustive + priorisation conseillée.
> **À arbitrer** : ce qui est livré au Lot 2, ce qui peut attendre, ce qui peut être abandonné.

---

## 1. Verdict en une phrase

**Avant de coder le Lot 2, tester le Lot 1 sur 3-5 utilisateurs réels.
Sinon on va investir 1-2 semaines sur des features (assembleur drag&drop,
seed exhaustif) que personne n'a demandées.**

---

## 2. Dette technique identifiée (à régler vite)

| Item | Effort | Risque si non traité |
|---|---|---|
| Reranking : catégorie `cat-query-rerank` vide → étape 4 de `search-base` sans brique | S (1-2h) | Solution `search-base` affiche un trou |
| Briques sans rating : 28/44 | M (3-4h, surtout du contenu) | Solutions affichent des alternatives sans argument de choix |
| Wizard `/configurateur` lit toujours `lib/engine/layers.ts` en dur | M (1 jour) | Double source de vérité, divergence garantie à terme |
| Pas de tests Playwright sur `/admin` et `/solutions` | M (1 jour) | Régression possible silencieuse à chaque refacto |
| Pas d'ADR `docs/DECISIONS.md` sur les 3 pivots | S (1-2h) | Mémoire des choix archi se perd |

---

## 3. Lot 2 — fonctionnalités client (priorisation suggérée)

### 3.1. Compléter le contenu (avant de coder)

**Avant tout ajout de feature**, finir ce qui manque pour que le Lot 1 soit "complet".

| Action | Effort | Pourquoi |
|---|---|---|
| Seeder ~5 briques de reranking (BGE-Reranker, Cohere, RankZephyr) | S | Débloquer `search-base` étape 4 |
| Compléter les ratings sur les 28 briques nues | M | Donner du fond aux solutions |
| Créer 2-3 nouvelles solutions (memo-mail, memo-conversation, ...) | M | Couvrir plus de cas d'usage |
| Tester chaque solution end-to-end (vraiment faire le workflow soi-même) | L | Détecter les trous opérationnels |

### 3.2. Brancher le wizard sur le catalogue BDD

Aujourd'hui `/configurateur` → `/resultats` lit `lib/engine/layers.ts` codé en dur.
Demain → doit lire les briques `validated` filtrées par preset compatible.

| Étape | Effort |
|---|---|
| Adapter `lib/engine/recommend.ts` pour fetcher depuis Supabase | M (4-6h) |
| Conserver le moteur de scoring existant (pur, testé) | RAS |
| Adapter `app/resultats/page.tsx` pour afficher les briques BDD | M (4-6h) |
| Supprimer `lib/engine/layers.ts` (ou le marquer deprecated) | S |

### 3.3. Sauvegarder une solution dans son espace

Bouton "Adopter cette solution" sur la fiche → ligne dans la table `configurations`
(déjà existante depuis les rails F9) → visible dans `/espace`.

| Étape | Effort |
|---|---|
| Server action `saveSolution(solution_id, profile_jsonb)` | S |
| Bouton sur `/solutions/[slug]` | S |
| Section "Mes solutions" sur `/espace` | M |

### 3.4. Vue publique du catalogue

Pour les visiteurs tech ET pour le SEO.

| Étape | Effort |
|---|---|
| Page `/briques` (= liste publique avec filtres) | M |
| Page `/briques/[slug]` (fiche détaillée d'une brique avec ses ratings) | M |
| Sitemap.xml + meta tags SEO | S |

---

## 4. Lot 3 — assembleur visuel (vraie vision Scratch)

**Pré-requis** : que le Lot 2 ait validé que les utilisateurs aiment les solutions.

### Trois niveaux possibles, par ordre de coût croissant

| Niveau | Quoi | Effort | Quand |
|---|---|---|---|
| 1 | Checklist intelligente : dropdown par catégorie, calcul prix live, vérif ports | 1-2 jours | Si les visiteurs demandent à modifier les solutions |
| 2 | Stack builder vertical : drag par rang, arêtes auto | 3-4 jours | Si le N1 ne suffit pas à exprimer la créativité utilisateur |
| 3 | Vrai graphe React Flow style LangFlow / n8n | 5-7 jours | Quand on a la preuve qu'il y a un marché pour ça |

**Recommandation** : ne pas anticiper le Lot 3 tant qu'on n'a pas vu des
utilisateurs essayer le Lot 1 + un éventuel N1 d'assembleur.

---

## 5. Lot 4 — production et commercialisation

Hors scope ingénierie. Mais à anticiper :

| Item | Quand |
|---|---|
| Déploiement Vercel prod (vs preview) | Quand au moins 3 solutions sont robustes |
| Domaine `mnemo.app` ou autre | Idem |
| Analytics (Plausible / Umami) | Avant tout lancement public |
| Page de pricing / abonnement | Quand le modèle économique est arbitré |
| Onboarding tunnel (email d'accueil...) | Quand il y a des inscriptions à gérer |
| Documentation publique pour les utilisateurs | Quand le produit a stabilisé |

---

## 6. Risques à arbitrer

### 6.1. Sur-engineering vs sous-engineering

Le modèle data actuel est **très complet** (ports typés, infra séparée du hardware, ratings contextuels). C'est ambitieux.

**Risque** : passer 2 mois à enrichir le catalogue / coder l'assembleur sans qu'aucun utilisateur n'ait jamais vu Mnémo en vrai.

**Mitigation** : freeze des features tant que `/` + `/solutions/[slug]` n'ont pas été testés sur 3-5 utilisateurs réels (artisans, freelances, cabinets).

### 6.2. Maintenir les ratings dans le temps

Une note Mnémo a une **date de péremption**. Mistral OCR à 0,001 €/page aujourd'hui peut devenir 0,003 € demain. Florence-3 va sortir et rendre Florence-2 obsolète.

**Mitigation** : section "À compléter" du dashboard `/admin` qui alerte sur les ratings de plus de 6 mois. Faire un check trimestriel.

### 6.3. Garder le wizard ou le supprimer

Aujourd'hui le wizard `/configurateur` est isolé du nouveau modèle. Trois options :

| Option | Coût | Bénéfice |
|---|---|---|
| A. Brancher sur le catalogue BDD | M (1 jour) | Cohérence totale |
| B. Le laisser tel quel, c'est un mode "sur-mesure" indépendant | 0 | Mode hybride OK mais dette technique |
| C. Le supprimer, on garde uniquement les solutions | 0 + casse une feature | Plus simple à maintenir |

**Recommandation** : Option A à court terme, B à très court terme si pas de temps.

---

## 7. Annexe — backlog brut (à arbitrer)

Items mentionnés au fil de la session, à classer :

- ADR `docs/DECISIONS.md` sur les pivots
- Index Supabase sur les `slug` (déjà uniques mais pas indexés pour les lookups admin)
- Page `/admin/dashboard/health` (briques non notées, sources mortes, prix anciens)
- Export CSV du catalogue
- Import bulk depuis CSV (pour seeder vite)
- Tests Playwright sur `/admin` + `/solutions`
- Validation : trigger Postgres qui interdit `solution_steps.recommended_brick_id` non null si catégorie de la brique ≠ `required_category_id`
- Tag versions de briques (Claude 3.5 vs Claude 4 vs Claude 4.7)
- Multi-langue : le contenu est en FR, ajouter EN pour l'international
- API publique pour exposer le catalogue (autres apps qui veulent l'intégrer)
- Webhook : être notifié quand un vendor change son prix (Firecrawl déjà à moitié branché)
- Vue "Hardware compatible" : pour un pack hardware donné, lister les briques qui tournent dessus
- Sauvegarde / restore du catalogue : `pg_dump` automatique périodique

---

## 8. Limites à assumer

- Mnémo n'est **pas** un outil de monitoring de prix en temps réel. Les
  ratings sont des **snapshots** à une date donnée. À retester périodiquement.
- Mnémo n'est **pas** un déployeur. Aucune intégration "click to deploy".
  Les solutions sont **descriptives**, pas exécutables. Si un utilisateur
  veut déployer la stack, c'est lui qui le fait (ou son installeur).
- Mnémo n'est **pas** un benchmark scientifique. Les scores sont
  **subjectifs** (sauf si `source='vendor_doc'`) et doivent être
  transparents là-dessus.

---

## 9. À retenir en une phrase

> **Le Lot 2 prioritaire = compléter le contenu (ratings + reranking + 2-3 solutions de plus) avant d'investir dans la feature visuelle. Tester sur 3-5 utilisateurs réels avant de coder l'assembleur drag&drop.**
