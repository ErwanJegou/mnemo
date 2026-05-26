---
date: 2026-05-26
auteur: Erwan Jégou + Claude
type: fiche
sujet: Mnémo — vue d'ensemble après la session 25-26 mai 2026
statut: référence-de-travail
tags: [mnemo, etat-projet, dashboard]
---

# Mnémo — vue d'ensemble après la session 25-26 mai 2026

> **Quoi** : plateforme de recommandation d'infrastructure de base mémorielle IA souveraine.
> **Statut** : pivot conceptuel majeur livré — de "configurateur preset" à "solutions orientées problème".
> **Stack** : Next.js 15 (App Router, React 19) + Supabase (Postgres + RLS) + Tailwind v3.

---

## 1. Ce que Mnémo fait aujourd'hui

Trois modes coexistent dans la même app :

| Mode | Cible | Point d'entrée |
|---|---|---|
| **Solutions** (nouveau) | Visiteur qui sait ce qu'il veut faire ("j'ai des images") | `/` → cards solutions → `/solutions/[slug]` |
| **Configurateur sur mesure** (existant) | Visiteur qui veut une stack adaptée à son profil | `/configurateur` (12 questions) → `/resultats` |
| **Admin catalogue** (nouveau) | Erwan, pour maintenir tout le contenu | `/admin/*` (garde email-whitelist) |

---

## 2. Métriques en BDD

Base cloud Supabase `mnemo-dev` (ref `youyxnrhncdoohfthdcb`, eu-west-3 Paris).

| Table | Lignes | Rôle |
|---|---|---|
| `solutions` | 4 | Recettes orientées problème (mémoriser image, PDF, réunion, chercher) |
| `solution_steps` | 22 | Étapes des solutions |
| `brick_categories` | 19 | Catégories génériques sur 7 rangs |
| `components` (= briques) | 44 | Implémentations concrètes |
| `brick_ports` | 100+ | Ports in/out par brique |
| `brick_infra_targets` | 60+ | Compatibilités brique × infra |
| `brick_quality_ratings` | 16 | Notes 1-5 par cas d'usage |
| `vendors` | 31 | Éditeurs logiciels (Mistral, Anthropic, Qdrant...) |
| `infra_targets` | 12 | Cibles d'hébergement (Hetzner, Scaleway, on-prem...) |
| `hardware_recipes` | 3 | Packs machine on-prem |
| `port_types` | 24 | Catalogue des types de données qui transitent |
| `price_history` | 19+ | Snapshots audit des prix |

Plus les tables existantes (rails F9) : `circles`, `memberships`, `network_consents`, `configurations`, `cost_observations`.

---

## 3. Les 4 solutions actuellement publiées

| Slug | Titre | Étapes | Prix estimé/mois |
|---|---|---|---|
| `memo-image` | Mémoriser une image | 6 | 25 € |
| `memo-pdf` | Mémoriser un PDF | 5 | 20 € |
| `memo-meeting` | Mémoriser une réunion | 5 | 35 € |
| `search-base` | Chercher dans ma base mémorielle | 6 | 30 € |

Détail dans `2026-05-26_fiche_erwan_mnemo-solutions-seedees.md`.

---

## 4. Stack technique appliquée

| Couche | Implémentation |
|---|---|
| Framework | Next.js 15 App Router, React 19, TypeScript strict |
| BDD | Supabase cloud (Postgres 16 + RLS + service role pour writes admin) |
| Auth | Supabase Auth (magic link email) |
| Styling | Tailwind v3 + tokens design Mnémo |
| Tests | Vitest (178 passent) + Playwright E2E |
| Hosting | Vercel (déploiement déjà branché) |

---

## 5. Conventions de code respectées

- TypeScript strict, **0 erreur** au typecheck
- ESLint **0 erreur 0 warning**
- Pas de `any` / `as` / `!`
- RLS activée sur **toutes** les tables (règle absolue)
- Writes admin via service role uniquement (jamais depuis le client)
- Code anglais, commentaires/UI français
- Accents sur majuscules obligatoires (É À È Ç)
- Helpers de catalogue purs et testés (`isAdminEmail`, parsers Form, `buildRfq`, etc.)

---

## 6. Accès rapides Erwan

| Action | URL |
|---|---|
| Voir la home publique | `http://localhost:3000/` |
| Voir une solution | `http://localhost:3000/solutions/memo-image` |
| Se connecter | `http://localhost:3000/connexion` (magic link sur jegouerwan@gmail.com) |
| Dashboard admin | `http://localhost:3000/admin` |
| Lister les briques | `http://localhost:3000/admin/components` |
| Lister les solutions | `http://localhost:3000/admin/solutions` |
| Lister les ratings | `http://localhost:3000/admin/ratings` |

Lancer le dev server sans polluer Claude Code :

```bash
# Dans un terminal séparé (PAS dans Claude Code)
cd "/Users/macbookpro/Documents/Application Claude/mnemo"
npm run dev

# OU en background avec logs fichier
nohup npm run dev > /tmp/mnemo-dev.log 2>&1 &
tail -f /tmp/mnemo-dev.log  # pour suivre
```

---

## 7. Variables d'environnement utilisées

`.env.local` à la racine :

```
NEXT_PUBLIC_SUPABASE_URL=https://youyxnrhncdoohfthdcb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...        # serveur uniquement, bypass RLS
SUPABASE_ACCESS_TOKEN=sbp_...                  # CLI Supabase
ADMIN_EMAILS=jegouerwan@gmail.com              # garde /admin
FIRECRAWL_API_KEY=                             # optionnel
```

---

## 8. Ce qui n'a PAS bougé dans la session

- Le wizard `/configurateur` (12 questions) reste inchangé. Il lit toujours
  `lib/engine/layers.ts` codé en dur.
- La charte fiduciaire `/fiduciaire` reste inchangée.
- L'espace utilisateur `/espace` (consentement F9, sauvegarde configs) reste
  inchangé.
- Le moteur d'export PDF/markdown `lib/export/` reste inchangé.
- Le bundle Exit Escrow `lib/exit/` reste inchangé.

C'est cohérent : la refonte ajoute des couches, elle ne casse pas l'existant.

---

## 9. Risques identifiés

| Risque | Impact | Mitigation |
|---|---|---|
| 28 briques sur 44 n'ont aucun rating | Solutions affichent peu de scores | Compléter via `/admin/ratings/new` |
| Catégorie "Reranking" vide | Étape 4 de `search-base` sans brique reco | Seeder BGE-Reranker, Cohere Rerank |
| Wizard pas branché sur le catalogue | Deux sources de vérité (code + BDD) | Lot 2 : remplacer `layers.ts` par lecture BDD |
| Pas d'assembleur drag&drop | Vision "Scratch-like" non livrée | Lot 2 : React Flow ou stack builder vertical |
| Pas de tests E2E sur les nouvelles routes | Régression possible silencieuse | Lot 2 : Playwright sur /admin + /solutions |

---

## 10. À retenir en une phrase

> **Mnémo est passé en une session d'un configurateur figé à
> une plateforme éditable orientée problème. Le modèle data tient (12 tables,
> RLS, 178 tests verts) et l'UI publique est prête à recevoir des visiteurs.**
