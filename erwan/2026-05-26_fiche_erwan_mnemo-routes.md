---
date: 2026-05-26
auteur: Erwan Jégou + Claude
type: fiche
sujet: Mnémo — toutes les routes (publiques + admin)
statut: référence-de-travail
tags: [mnemo, routes, navigation, sitemap]
---

# Mnémo — toutes les routes publiques + admin

> **Quoi** : sitemap technique complet de Mnémo après la session 25-26 mai 2026.
> **Quand l'utiliser** : pour naviguer dans l'app, débugger une route, ou
> savoir où ajouter une nouvelle page.

---

## 1. Routes publiques (anonyme — pas besoin de login)

| Route | Fichier | Quoi |
|---|---|---|
| `/` | `app/page.tsx` | **Home orientée problème** : 4 cards solutions + lien wizard sur-mesure |
| `/solutions/[slug]` | `app/solutions/[slug]/page.tsx` | Fiche solution : workflow étape par étape avec alternatives + ratings |
| `/configurateur` | `app/configurateur/page.tsx` | **Wizard 12 questions** (inchangé, mode sur-mesure) |
| `/resultats` | `app/resultats/page.tsx` | Recommandation issue du wizard (inchangé) |
| `/fiduciaire` | `app/fiduciaire/page.tsx` | Charte fiduciaire F8 (inchangé) |
| `/connexion` | `app/connexion/page.tsx` | Magic link email (Supabase Auth, inchangé) |
| `/auth/callback` | `app/auth/callback/page.tsx` | Callback OAuth (inchangé) |

Plus une API route : `/api/pricing` (price feed Firecrawl, inchangé).

---

## 2. Routes utilisateur connecté (rails F9)

| Route | Quoi |
|---|---|
| `/espace` | Mon espace : cercles, consentement réseau, configurations sauvegardées |

---

## 3. Routes admin (garde email-whitelist `ADMIN_EMAILS`)

### 3.1. Tableau de bord + briques

| Route | Quoi |
|---|---|
| `/admin` | **Dashboard** : KPIs (solutions, briques, vendors, infra, ratings...) + alertes + raccourcis |
| `/admin/components` | Liste détaillée des 44 briques, groupée par rang → catégorie, filtres vendor/statut/preset/rang/catégorie |
| `/admin/components/new` | Form création brique enrichi (vendor + catégorie + ports + infra) |
| `/admin/components/[id]/edit` | Form édition brique + historique des prix + bouton "Demander un prix" (mailto) |

### 3.2. Solutions

| Route | Quoi |
|---|---|
| `/admin/solutions` | Liste des solutions, badge complexité + statut + nombre d'étapes |
| `/admin/solutions/new` | Form création (titre, problem_statement, emoji, complexité, prix estimé) |
| `/admin/solutions/[id]/edit` | Édition de la solution + sous-liste des étapes |
| `/admin/solutions/[id]/steps/new` | Form création étape (catégorie + brique reco + alternatives + ports) |
| `/admin/solutions/[id]/steps/[stepId]/edit` | Form édition étape |

### 3.3. Catégories / Vendors / Infra / Hardware / Ports / Ratings

Tous suivent le même pattern : liste + new + [id]/edit.

| Section | Liste | Create | Edit |
|---|---|---|---|
| Catégories briques | `/admin/categories` | `/admin/categories/new` | `/admin/categories/[id]/edit` |
| Vendors | `/admin/vendors` | `/admin/vendors/new` | `/admin/vendors/[id]/edit` |
| Cibles infra | `/admin/infra` | `/admin/infra/new` | `/admin/infra/[id]/edit` |
| Packs hardware | `/admin/hardware` | `/admin/hardware/new` | `/admin/hardware/[id]/edit` |
| Types de ports | `/admin/ports` | `/admin/ports/new` | `/admin/ports/[id]/edit` |
| Ratings qualité | `/admin/ratings` | `/admin/ratings/new` | `/admin/ratings/[id]/edit` |

---

## 4. Layout admin

`app/admin/layout.tsx` :
- Garde côté serveur : redirect `/connexion` si non auth, redirect `/espace?erreur=...` si email pas dans `ADMIN_EMAILS`
- Header sticky avec nav : Tableau de bord · Solutions · Briques · Catégories · Vendors · Infra · Hardware · Ports · Ratings · Mon espace
- Affiche l'email connecté en chip primary

---

## 5. Server Actions disponibles

Tous dans `app/admin/<section>/actions.ts`. Conventions :
- `assertAdmin()` au début de chaque action (deuxième barrière en plus du layout)
- writes via `createAdminClient()` (service role, bypass RLS)
- Redirect vers `?errors=<json-uri-encoded>` en cas de validation échouée
- `revalidatePath()` sur les paths concernés
- Redirect `?ok=<code>` sur succès

| Fichier | Actions exposées |
|---|---|
| `app/admin/components/actions.ts` | `createComponent`, `updateComponent`, `deleteComponent` |
| `app/admin/vendors/actions.ts` | `createVendor`, `updateVendor`, `deleteVendor` |
| `app/admin/infra/actions.ts` | `createInfra`, `updateInfra`, `deleteInfra` |
| `app/admin/hardware/actions.ts` | `createHardware`, `updateHardware`, `deleteHardware` |
| `app/admin/categories/actions.ts` | `createCategory`, `updateCategory`, `deleteCategory` |
| `app/admin/ports/actions.ts` | `createPortType`, `updatePortType`, `deletePortType` |
| `app/admin/solutions/actions.ts` | `createSolution`, `updateSolution`, `deleteSolution`, `createStep`, `updateStep`, `deleteStep` |
| `app/admin/ratings/actions.ts` | `createRating`, `updateRating`, `deleteRating` |

---

## 6. Composants UI réutilisés

Dans `components/admin/` :

| Composant | Utilisé par |
|---|---|
| `VendorForm.tsx` | new + edit vendor |
| `ComponentForm.tsx` | new + edit brique (gros form, ~330 lignes) |
| `InfraForm.tsx` | new + edit infra target |
| `HardwareForm.tsx` | new + edit hardware recipe |
| `CategoryForm.tsx` | new + edit catégorie |
| `PortTypeForm.tsx` | new + edit type de port |
| `SolutionForm.tsx` | new + edit solution |
| `SolutionStepForm.tsx` | new + edit étape de solution |
| `RatingForm.tsx` | new + edit rating |
| `RfqButton.tsx` | Bouton "Demander un prix" sur fiche brique |

---

## 7. Smoke test runtime des routes

Pour vérifier que toutes les routes répondent après un changement :

```bash
# Lancer le dev server en background (dans un terminal séparé)
nohup npm run dev > /tmp/mnemo-dev.log 2>&1 &
sleep 12

# Test routes publiques (attendu : 200)
for path in / /solutions/memo-image /solutions/memo-pdf /solutions/memo-meeting /solutions/search-base /configurateur /resultats /fiduciaire; do
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  printf "%-35s %s\n" "$path" "$code"
done

# Test routes admin (attendu : 307 redirect /connexion si pas loggué)
for path in /admin /admin/components /admin/solutions /admin/categories /admin/vendors /admin/infra /admin/hardware /admin/ports /admin/ratings; do
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  printf "%-35s %s\n" "$path" "$code"
done

# Arrêter
pkill -f "next dev"
```

---

## 8. Routes manquantes ou à créer (Lot 2)

| Route | Pourquoi |
|---|---|
| `/briques` ou `/catalogue` | Vue publique du catalogue pour visiteurs tech / SEO |
| `/solutions/[slug]/save` | Sauvegarder une solution dans son espace perso (utilise `configurations` existante) |
| `/admin/dashboard/health` | Surveillance technique (briques sans rating, prix anciens, sources mortes) |
| `/admin/exports/csv` | Export CSV du catalogue pour analyse externe |
| `/admin/import` | Import bulk de briques depuis CSV |

---

## 9. Métriques de build

Sortie de `npm run build` (extrait) :

```
31 routes compilées dont :
- 8 routes publiques (dont 4 dynamiques /solutions/[slug])
- 23 routes admin
- 1 route API (/api/pricing)
- 1 middleware (90 kB)

First Load JS shared : 103 kB
Pages les plus lourdes : /resultats (8.31 kB), /configurateur (5 kB)
Pages les plus légères : 134 B (auth/callback, api/pricing)
```

---

## 10. À retenir en une phrase

> **31 routes Next.js compilées, 7 publiques pour le visiteur,
> 23 admin pour Erwan, toutes gardées par RLS Supabase + helper
> `isAdminEmail` côté serveur.**
