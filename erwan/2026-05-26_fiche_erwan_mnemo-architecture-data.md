---
date: 2026-05-26
auteur: Erwan Jégou + Claude
type: fiche
sujet: Mnémo — architecture data Supabase
statut: référence-de-travail
tags: [mnemo, supabase, schema, rls]
---

# Mnémo — architecture data Supabase

> **Quoi** : description complète du schéma BDD Mnémo après la session 25-26 mai 2026.
> **Quand l'utiliser** : avant de modifier une table, d'ajouter une fonctionnalité,
> ou d'écrire une nouvelle migration.

---

## 1. Vue d'ensemble

12 tables dans le schéma `public`, en trois groupes :

```
RAILS F9 (multi-tenant, existait avant la session)
  circles
  memberships
  network_consents
  configurations
  cost_observations

CATALOGUE (briques + relations, créé pendant la session)
  vendors                     éditeurs logiciels
  components (= bricks)       implémentations concrètes
  brick_categories            taxonomie générique
  port_types                  types de données circulant
  infra_targets               cibles d'hébergement
  hardware_recipes            packs machine on-prem
  brick_ports                 liaison brique × port (in/out)
  brick_infra_targets         liaison brique × infra
  price_history               snapshots audit

SOLUTIONS (couche métier, créée en fin de session)
  solutions
  solution_steps
  brick_quality_ratings
```

---

## 2. Diagramme relationnel simplifié

```
                          brick_categories (18 lignes)
                                │
                                │ category_id (nullable)
                                ▼
vendors (31) ────vendor_id──→ components (44) ←──────── solutions (4)
                                │   │   │                    │
                                │   │   │                    │ solution_id
                                │   │   │                    ▼
                                │   │   │              solution_steps (22)
                                │   │   │                    │
                                │   │   │           required_category_id
                                │   │   │           recommended_brick_id
                                │   │   │           alternative_brick_ids[]
                                │   │   │           input_port_id / output_port_id
                                │   │   │
                                │   │   └──── brick_quality_ratings (16)
                                │   │
                                │   └──── brick_ports ──→ port_types (24)
                                │
                                └──── brick_infra_targets ──→ infra_targets (12)

infra_targets ──vendor_id (nullable)──→ vendors
hardware_recipes (3)   (standalone, pas de FK vers briques)
```

---

## 3. Tables du catalogue — détail

### 3.1. `vendors`

Éditeurs logiciels rattachés aux briques. Sert aussi pour le bouton RFQ (mailto).

| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text unique | ex. `mistral-ai`, `anthropic` |
| `name` | text | |
| `country` | text | code ISO 2 lettres |
| `sovereignty_zone` | enum | `eu / us / maroc / other` |
| `website` | text | |
| `contact_email` | text | utilisé pour mailto RFQ |
| `contact_form_url` | text | fallback si pas d'email |
| `notes` | text | interne admin |

**RLS** : select public, write bloqué (service role uniquement).

### 3.2. `components` (renommée mentalement "briques" mais reste `components` en BDD)

Une implémentation concrète d'une catégorie par un vendor.

| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `vendor_id` | uuid FK → vendors | |
| `category_id` | uuid FK → brick_categories (nullable) | nullable car ajouté en pivot 2 |
| `layer_id` | smallint 0-6 | rétro-compat wizard |
| `slug` | text unique | ex. `preingest-ocr-mistral-api` |
| `name`, `tier`, `description` | text | |
| `pricing_model` | enum | `free / flat / usage / self_host / contact` |
| `base_price_eur` | numeric | trigger snapshot dans `price_history` à chaque change |
| `unit` | text | `mois`, `page`, `image`, `1k_tokens`, etc. |
| `preset_fit` | text[] | `light / medium / hard` (rétro-compat preset) |
| `capabilities` | jsonb | attributs libres |
| `confidence` | enum | `low / medium / high` |
| `status` | enum | `draft / validated / deprecated` |
| `rfq_template` | text | override du template mailto par défaut |

**RLS** : select public uniquement sur `status='validated'`.

### 3.3. `brick_categories`

18 catégories génériques sur 7 rangs.

| Colonne | Type | Note |
|---|---|---|
| `slug` | text unique | ex. `cat-preingest-vision` |
| `name` | text | |
| `rank` | enum | `preingest / ingest / storage / query / ai / surface / ops` |
| `position` | smallint | ordre dans le rang |

### 3.4. `port_types`

Catalogue des types de données qui transitent entre briques (24 types initiaux).

Familles : `file`, `text`, `embedding`, `structured`, `query`, `storage_capacity`.

Exemples : `file/image`, `text/markdown`, `embedding/dense`, `query/topk`, `storage/vector`.

### 3.5. `infra_targets`

Où peut tourner une brique (12 cibles initiales).

| Colonne clé | Note |
|---|---|
| `infra_kind` enum | `vps_managed / bare_metal / gpu_rented / on_prem / saas_managed` |
| `vendor_id` (nullable) | pour les SaaS managés et VPS |
| `specs` jsonb | `{"cpu_vcpu":2,"ram_gb":4,"gpu_vram_gb":24}` |
| `base_price_eur` + `unit` | tarif mensuel ou horaire |

### 3.6. `hardware_recipes`

Packs machine pour ceux qui partent on-prem (3 initiaux).

| Colonne clé | Note |
|---|---|
| `use_case` | "RAG perso CPU", "Cabinet régulé GPU"... |
| `bom` jsonb | Bill of materials `[{part, model, price_eur, vendor, url}]` |
| `total_price_eur` | total du pack |
| `installer_notes` | "Compter 2h, ~150€ pour un local" |

### 3.7. `brick_ports`

Liaison N-N typée entre briques et ports.

Clé primaire composite : `(brick_id, port_type_id, direction)`. `direction` = `in` ou `out`.

### 3.8. `brick_infra_targets`

Liaison N-N entre briques et cibles d'infra. Marque les compatibilités.

Champ `recommended` (boolean) pour indiquer la cible idéale.

### 3.9. `price_history`

Snapshot automatique via trigger `snapshot_component_price` à chaque INSERT ou
UPDATE de `base_price_eur` / `pricing_model` / `unit` sur `components`.

---

## 4. Tables des solutions — détail

### 4.1. `solutions`

| Colonne | Type | Note |
|---|---|---|
| `slug` | text unique | ex. `memo-image` |
| `title` | text | "Mémoriser une image" |
| `problem_statement` | text | "J'ai des photos, je veux les retrouver..." |
| `audience` | text | "Tout le monde", "Cabinets régulés" |
| `complexity` | check | `easy / medium / hard` |
| `total_price_estimate_eur` | numeric | |
| `estimated_setup_minutes` | int | |
| `status` | enum | `draft / validated / deprecated` |
| `hero_emoji` | text | 📸 📄 🎤 🔍 (utilisé dans les cards) |
| `hero_color` | text | slug couleur (primary, secondary, tertiary) |
| `position` | smallint | ordre sur la home |

### 4.2. `solution_steps`

| Colonne | Type | Note |
|---|---|---|
| `solution_id` | uuid FK | cascade delete |
| `position` | smallint | 1, 2, 3... unique par solution |
| `title`, `description` | text | |
| `required_category_id` | uuid FK | catégorie générique requise |
| `recommended_brick_id` | uuid FK | brique conseillée |
| `alternative_brick_ids` | uuid[] | autres briques valables |
| `input_port_id` / `output_port_id` | uuid FK | flux de données |
| `decision_notes` | text | aide au choix entre reco et alternatives |

### 4.3. `brick_quality_ratings`

| Colonne | Type | Note |
|---|---|---|
| `brick_id` | uuid FK | |
| `use_case` | text | "OCR facture", "Vision schéma technique" |
| `score` | smallint 1-5 | ★★★★★ |
| `cost_per_op_eur` | numeric | coût unitaire pour CE cas d'usage |
| `cost_unit` | text | "page", "image", "minute"... |
| `notes` | text | pourquoi ce score |
| `source` | check | `internal / user_report / vendor_doc` |
| `rated_at` | date | |

Contrainte unique `(brick_id, use_case)` : on ne note pas deux fois la même brique sur le même cas.

---

## 5. Conventions RLS

| Table | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `vendors` | public (anon + authenticated) | service role |
| `components` | public si `status='validated'` | service role |
| `brick_categories` | public | service role |
| `port_types` | public | service role |
| `infra_targets` | public si `status='validated'` | service role |
| `hardware_recipes` | public si `status='validated'` | service role |
| `brick_ports` | public si la brique parente est `validated` | service role |
| `brick_infra_targets` | public si la brique parente est `validated` | service role |
| `solutions` | public si `status='validated'` | service role |
| `solution_steps` | public si la solution parente est `validated` | service role |
| `brick_quality_ratings` | public si la brique parente est `validated` | service role |
| `price_history` | public si la brique parente est `validated` | service role |

**Principe** : la garde admin est dans l'app (helper `isAdminEmail`) + les writes
passent par le client service role qui bypass RLS. Aucune policy d'écriture
pour anon/authenticated → bloqué par défaut.

---

## 6. Triggers en place

| Trigger | Sur | Action |
|---|---|---|
| `snapshot_component_price` | `components` AFTER INSERT/UPDATE | INSERT dans `price_history` |
| `*_touch` | toutes les tables avec `updated_at` BEFORE UPDATE | bump `updated_at = now()` |
| `handle_new_user` | `auth.users` AFTER INSERT | crée un `circle` + `membership` owner |

---

## 7. Fichiers de migration

Tous dans `supabase/migrations/`, exécutés dans l'ordre :

| Fichier | Quoi |
|---|---|
| `20260525010854_init_rails.sql` | Rails F9 (existait avant la session) |
| `20260525234316_catalogue_components.sql` | Catalogue plat : vendors + components + price_history |
| `20260526013844_taxonomy_refactor.sql` | Refonte : brick_categories + port_types + infra_targets + hardware_recipes + brick_ports + brick_infra_targets |
| `20260526021849_solutions_framework.sql` | Solutions + steps + ratings + ~25 briques manquantes |

**Push** : `npx supabase db push --include-all` (avec `SUPABASE_ACCESS_TOKEN` dans l'env).

---

## 8. Types TypeScript

Tous tenus à la main dans `lib/supabase/types.ts`. Alignés sur les migrations
ci-dessus. Convention : `XxxRow` (Read) + `Database.public.Tables.xxx.Insert/Update`.

À mettre à jour manuellement à chaque nouvelle migration.

---

## 9. Helpers et parsers

Dans `lib/catalogue/` :

| Fichier | Quoi |
|---|---|
| `slug.ts` | `slugify`, `isValidSlug` |
| `labels.ts` | Libellés FR + formatters (formatPrice, formatScore, formatCheckDate) |
| `parseSearchErrors.ts` | Décode les erreurs renvoyées par les server actions |
| `vendorForm.ts` | Parse FormData → VendorInsert |
| `componentForm.ts` | Parse FormData → ComponentFormParsed (composant + ports + infra) |
| `infraForm.ts` | Parse FormData → InfraInsert |
| `hardwareForm.ts` | Parse FormData → HardwareInsert (avec validation BOM) |
| `categoryForm.ts` | Parse FormData → CategoryInsert |
| `portTypeForm.ts` | Parse FormData → PortTypeInsert |
| `solutionForm.ts` | Parse FormData → SolutionInsert |
| `solutionStepForm.ts` | Parse FormData → SolutionStepInsert |
| `ratingForm.ts` | Parse FormData → RatingInsert |

Tous **purs**, sans dépendance Next, testables avec Vitest.
Couverture : 46 tests sur les parsers, +10 sur `isAdminEmail`.

---

## 10. Annexe — quelques requêtes utiles

Compter les briques par catégorie :

```sql
select cat.name, count(c.id) as briques
from brick_categories cat
left join components c on c.category_id = cat.id
group by cat.name
order by briques desc;
```

Trouver les briques sans rating :

```sql
select c.name, c.slug
from components c
where c.id not in (select brick_id from brick_quality_ratings)
order by c.name;
```

Lister les briques compatibles avec une infra donnée :

```sql
select c.name, c.base_price_eur, c.unit
from components c
join brick_infra_targets bit on bit.brick_id = c.id
join infra_targets it on it.id = bit.infra_target_id
where it.slug = 'on-prem-home'
  and c.status = 'validated';
```

---

## 11. À retenir en une phrase

> **12 tables, séparation stricte vendors/infra/hardware, RLS partout,
> writes via service role, triggers d'historique et de touch, 178 tests
> verts sur les helpers purs.**
