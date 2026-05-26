---
date: 2026-05-26
auteur: Erwan Jégou + Claude
type: methode
sujet: Mnémo — les 3 pivots conceptuels de la session 25-26 mai
statut: référence-de-travail
tags: [mnemo, decisions, architecture, historique]
---

# Mnémo — les 3 pivots conceptuels de la session

> **Pourquoi cette fiche** : comprendre les choix d'architecture actuels
> nécessite de connaître les pivots qu'on a faits dans l'ordre.
> Sans ça, le modèle data semble compliqué pour rien.

---

## 1. État initial du projet (avant la session)

Mnémo était un **configurateur déterministe** :

- Un wizard de 12 questions → un profil utilisateur
- Le profil → un preset (LIGHT / MEDIUM / HARD)
- Le preset → 3 stacks figées en dur dans `lib/engine/layers.ts`
- 7 couches (C0 → C6), pour chaque couche un choix par preset
- Total : 7 × 3 = 21 combinaisons codées en dur (en réalité 19 car C0 identique sur les 3)

**Limite** : pour ajouter un produit, modifier un prix, comparer une alternative
→ il fallait modifier du code, le tester, le rebuilder.

---

## 2. Pivot 1 — Sortir le catalogue du code vers Supabase

### Déclencheur

> "dans le simulateur il y a plein de choses c'est facile comme ça mais dans
> le fond il y a des plateformes, des serveurs à acheter, autre."

Erwan voit que le simulateur masque la complexité réelle (combien coûte vraiment un VPS, qui sont les vrais vendors derrière).

### Décision

Créer un **catalogue éditable** dans Supabase :

- `vendors` (14 lignes au seed initial)
- `components` = les 19 briques extraites de `layers.ts`
- `price_history` (snapshot automatique sur changement de prix via trigger)
- `/admin/*` protégé par garde email-whitelist
- RLS : lecture publique sur les briques `validated`, writes via service role uniquement

### Stories livrées

`S-01` à `S-06` : migration + garde admin + page catalogue + CRUD vendor + CRUD composant + bouton "Demander un prix" (mailto).

### Résultat

Le catalogue existe, modifiable, mais reste **un inventaire plat**. Le simulateur
public n'est pas branché dessus.

---

## 3. Pivot 2 — Casser la taxonomie en briques génériques + ports + infra + hardware

### Déclencheur

> "le catalogue il y a déjà des solutions toutes faites mais on peut rien
> brancher ensemble et on ne sait pas quoi est compatible avec qui."

Erwan veut un assembleur (référence visuelle : Scratch). Avant de pouvoir
assembler, il faut savoir **quelle pièce s'emboîte avec quelle pièce**.

### Décision

Séparer ce qu'on confondait :

| Avant | Après |
|---|---|
| Une brique = un produit d'un vendor | Une brique = une **implémentation** d'une **catégorie générique** |
| `layer_id` (0-6) flou | `category_id` qui pointe vers `brick_categories` (18 catégories sur 7 rangs) |
| `capabilities` jsonb vague | `brick_ports` (in/out typés via `port_types`) |
| `vendors` mélangeait éditeurs et hébergeurs | Split : `vendors` (éditeurs) + `infra_targets` (hébergeurs) |
| Pas de hardware | Nouvelle table `hardware_recipes` (BOM + prix + lien achat + notes installeur) |

### Stories livrées

`R-01` à `R-06` : migration refonte + types TS + page admin par rang/catégorie + CRUD brique enrichi (ports + infra) + CRUD infra + CRUD hardware + CRUD catégories + CRUD ports.

### Résultat

Le modèle data devient **graphe orienté** :
- chaque brique déclare ses entrées et sorties typées
- chaque brique déclare où elle peut tourner
- le futur drag&drop pourra valider automatiquement les compatibilités

Mais le catalogue reste **orienté produit**, pas **orienté problème**.

---

## 4. Pivot 3 — Passer du catalogue orienté produit au catalogue orienté problème

### Déclencheur

> "dans le catalogue on ne devrait pas avoir tout le rang ingestion
> pré-ingestion... pour faire une recherche ça marche pas car c'est à
> l'intérieur du produit car en fait on crée une solution pour un problème.
> exemple j'ai des images à traiter comment je fais"

Erwan distingue clairement **inventaire** (back-office) et **solution** (vitrine).
Le visiteur ne devrait pas voir le catalogue, il devrait voir : "voici un workflow validé pour ton problème".

### Décision

Ajouter une couche au-dessus du catalogue :

| Concept | Table | Rôle |
|---|---|---|
| **Solution** | `solutions` | Recette nommée orientée problème ("Mémoriser une image") |
| **Étape** | `solution_steps` | Une étape ordonnée, avec brique recommandée + alternatives + ports + notes de décision |
| **Notation contextuelle** | `brick_quality_ratings` | Note 1-5 + coût par cas d'usage ("OCR sur facture" ≠ "OCR sur photo") |

Plus seeder **~25 briques manquantes** que le catalogue n'avait pas (toute la pré-ingestion : OCR, Vision LLM, transcription audio ; pipelines n8n / Trigger.dev ; stockage objet/blob).

### Stories livrées

`S-01` à `S-06` (la deuxième série) : migration solutions framework + types TS + page d'accueil refondue + page solution publique + admin solutions (avec sous-CRUD steps) + admin ratings.

Plus `D-01` et `D-02` : dashboard `/admin` + déplacement de la liste détaillée vers `/admin/components`.

### Résultat

Architecture finale en 3 couches :

```
PUBLIC (visiteur lambda)
  / → Cards "Quel est ton problème ?"
  /solutions/[slug] → Workflow étape par étape avec alternatives notées

ADMIN (Erwan)
  /admin → Dashboard de synthèse (KPIs, alertes, raccourcis)
  /admin/solutions → CRUD recettes (la VRAIE entrée)
  /admin/ratings → Notation qualité contextuelle
  /admin/components → Inventaire détaillé (anciennement /admin)
  /admin/{categories|vendors|infra|hardware|ports} → Sous-CRUD spécialisés
```

---

## 5. Pourquoi ces 3 pivots dans cet ordre

| Pivot | Sans le pivot précédent ? |
|---|---|
| 2 (taxonomie) | Impossible : sans catalogue éditable, on n'a rien à casser |
| 3 (solutions) | Possible mais incohérent : on aurait des solutions qui pointent vers du code en dur au lieu de briques BDD |

L'ordre n'était pas évident **a priori** mais il est cohérent **a posteriori** :
on a d'abord externalisé la donnée (1), puis on l'a typée (2), puis on l'a
encapsulée dans des recettes utilisables (3).

---

## 6. Ce que ces pivots impliquent pour la suite

| Décision passée | Implication future |
|---|---|
| Catalogue en BDD | Toute évolution se fait via `/admin`, plus jamais via code |
| Ports typés | Quand on construit l'assembleur drag&drop, le matching est trivial (un port out matche un port in si même `port_type_id`) |
| Solutions séparées des briques | On peut publier ou déprécier une recette sans toucher aux briques (et inversement) |
| Notation par cas d'usage | Pour chaque nouvelle brique, il faut **noter** sinon les solutions n'ont pas d'argument qualité/prix |
| `layer_id` (0-6) conservé | Compat wizard. À retirer le jour où le wizard lit le catalogue BDD |

---

## 7. Limites assumées

- **Le wizard `/configurateur` n'est pas branché** sur le catalogue BDD. Il
  lit toujours `lib/engine/layers.ts`. Deux sources de vérité = à corriger en Lot 2.
- **L'assembleur visuel n'existe pas encore**. Le modèle data est prêt
  (ports typés, compatibilités), mais l'UI graphique reste à construire.
- **Le catalogue n'a pas de vue publique**. Les visiteurs ne voient que les
  solutions. À évaluer si une page `/briques` est nécessaire pour SEO ou pour
  les visiteurs tech curieux.

---

## 8. À retenir en une phrase

> **Trois pivots successifs ont transformé Mnémo : (1) sortir le catalogue
> du code, (2) typer les compatibilités entre briques, (3) emballer le
> tout dans des recettes orientées problème — sans casser le wizard existant.**
