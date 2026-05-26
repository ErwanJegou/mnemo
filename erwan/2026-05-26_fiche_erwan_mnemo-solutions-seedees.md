---
date: 2026-05-26
auteur: Erwan Jégou + Claude
type: fiche
sujet: Mnémo — les 4 solutions seedées (workflow par workflow)
statut: référence-de-travail
tags: [mnemo, solutions, workflows, seed]
---

# Mnémo — les 4 solutions seedées

> **Quoi** : description complète des 4 recettes orientées problème
> publiées en page d'accueil de Mnémo après la session 25-26 mai 2026.
> **Quand l'utiliser** : pour ajouter une solution similaire, ou pour
> modifier une étape existante via `/admin/solutions`.

---

## 1. Vue d'ensemble

| Slug | Titre | Emoji | Étapes | Prix estimé | Complexité | Setup |
|---|---|---|---|---|---|---|
| `memo-image` | Mémoriser une image | 📸 | 6 | 25 €/mois | easy | 30 min |
| `memo-pdf` | Mémoriser un PDF | 📄 | 5 | 20 €/mois | easy | 45 min |
| `memo-meeting` | Mémoriser une réunion | 🎤 | 5 | 35 €/mois | medium | 60 min |
| `search-base` | Chercher dans ma base mémorielle | 🔍 | 6 | 30 €/mois | medium | 30 min |

Toutes les 4 sont en `status='validated'` et apparaissent en page `/`.

---

## 2. Solution `memo-image` — Mémoriser une image

> **Cible** : tout le monde.
> **Énoncé du problème** : "J'ai des photos, captures d'écran, schémas. Je veux pouvoir les retrouver plus tard avec leur contexte (description, date, source)."

### Workflow

```
[file/image]
    │
    ▼
 ┌──────────────────────────────────────────────┐
 │ 1. Comprendre l'image                        │
 │   Reco : Claude Vision (Sonnet 4)            │
 │   Alt  : Gemini Vision · Qwen2-VL · Florence-2│
 │   Décision : Claude = top qualité, Gemini = volume,
 │              Qwen2-VL/Florence-2 = 100% local │
 └──────────────────────────────────────────────┘
    │ text/plain
    ▼
 ┌──────────────────────────────────────────────┐
 │ 2. Stocker l'image originale                 │
 │   Reco : Dossier local                       │
 │   Alt  : Supabase Storage · Backblaze B2 · MinIO│
 └──────────────────────────────────────────────┘
    │ storage/blob
    ▼
 ┌──────────────────────────────────────────────┐
 │ 3. Assembler la fiche mémoire                │
 │   Reco : Frontmatter Xavier v1.0.0           │
 └──────────────────────────────────────────────┘
    │ text/frontmatter
    ▼
 ┌──────────────────────────────────────────────┐
 │ 4. Orchestrer le pipeline                    │
 │   Reco : n8n self-host                       │
 │   Alt  : n8n cloud · Script Python custom    │
 └──────────────────────────────────────────────┘
    │
    ▼
 ┌──────────────────────────────────────────────┐
 │ 5. Embedder pour la recherche                │
 │   Reco : Mistral embed API                   │
 │   Alt  : BGE-M3 local                        │
 └──────────────────────────────────────────────┘
    │ embedding/dense
    ▼
 ┌──────────────────────────────────────────────┐
 │ 6. Stocker l'embedding                       │
 │   Reco : Qdrant Cloud Free                   │
 │   Alt  : Postgres + pgvector (Supabase)      │
 └──────────────────────────────────────────────┘
    │
    ▼
 [storage/vector — prêt pour recherche]
```

### Ratings affichés

Sur Claude Vision (étape 1) :
- ★★★★★ "Description scène complexe" — 0,003 €/image — *Raisonnement contextuel exceptionnel*
- ★★★★★ "OCR sur capture d'écran" — 0,003 €/image — *Bonne lecture des UI complexes*

Sur Florence-2 (alternative) :
- ★★★☆☆ "OCR sur capture d'écran" — gratuit — *Correct, limite sur les petits caractères*

---

## 3. Solution `memo-pdf` — Mémoriser un PDF

> **Cible** : freelances, cabinets.
> **Énoncé du problème** : "J'ai des factures, contrats, rapports en PDF. Je veux les indexer pour les retrouver par contenu (pas juste par nom de fichier)."

### Workflow

```
[file/pdf]
    │
    ▼
 1. Extraire texte + structure
    Reco : Marker (PDF → markdown via deep learning)
    Alt  : Docling · Mistral OCR API · LlamaParse · Unstructured.io
    Décision : Marker pour PDF académiques, Mistral OCR pour factures,
               LlamaParse pour SaaS RAG-optimisé
    │ text/markdown
    ▼
 2. Stocker le PDF original
    Reco : Dossier local
    Alt  : Backblaze B2 · Supabase Storage
    │ storage/blob
    ▼
 3. Découper en chunks (Frontmatter Xavier)
    │ text/chunked
    ▼
 4. Embedder
    Reco : Mistral embed API
    Alt  : BGE-M3 local · Qwen3-Embed-7B
    │ embedding/dense
    ▼
 5. Indexer (Qdrant ou pgvector)
    │
    ▼
 [storage/vector]
```

### Ratings affichés

Sur Marker :
- ★★★★★ "OCR PDF académique avec tables" — gratuit — *Référence OSS pour ce cas*
- ★★★★☆ "OCR facture imprimée propre" — gratuit — *Fonctionne, mais surdimensionné*

Sur Mistral OCR API (alternative) :
- ★★★★★ "OCR facture imprimée propre" — 0,001 €/page — *Sortie markdown structurée, rapide*
- ★★★★☆ "OCR PDF académique avec tables" — 0,001 €/page — *Bon mais Marker préserve mieux les formules*

---

## 4. Solution `memo-meeting` — Mémoriser une réunion

> **Cible** : consultants, cabinets.
> **Énoncé du problème** : "J'ai un enregistrement audio de réunion / RDV. Je veux la transcription, les actions à faire et une fiche cherchable."

### Workflow

```
[file/audio]
    │
    ▼
 1. Transcrire l'audio
    Reco : AssemblyAI Universal-2 (diarization)
    Alt  : Whisper Large-v3 local · Whisper API OpenAI · Plaud
    Décision : AssemblyAI = top diarization (~5€ pour 22h),
               Whisper local = souveraineté absolue,
               Plaud = veut aussi le hardware d'enregistrement
    │ text/plain + metadata/jsonld (diarization, sentiment)
    ▼
 2. Extraire entités (Graphiti)
    Reco : Postgres + Graphiti
    │ relations/triple
    ▼
 3. Assembler la fiche réunion (Frontmatter Xavier)
    │ text/frontmatter
    ▼
 4. Stocker l'audio original
    Reco : Dossier local
    Alt  : Backblaze B2
    │ storage/blob
    ▼
 5. Embedder + indexer
    Reco : BGE-M3 local (souveraineté)
    Alt  : Mistral embed API
    │
    ▼
 [storage/vector]
```

### Ratings affichés

Sur AssemblyAI :
- ★★★★★ "Transcription réunion 5 locuteurs" — 0,0037 €/min — *Diarization + sentiment intégrés*

Sur Whisper local (alternative) :
- ★★★★★ "Transcription FR voix claire (1 locuteur)" — gratuit — *Whisper Large-v3, qualité top*
- ★★★☆☆ "Transcription réunion 5 locuteurs" — gratuit — *Pas de diarization native*

Sur Plaud (alternative) :
- ★★★★★ "Capture passive RDV physique" — 14 €/mois + hardware ~160 € — *Pas besoin de sortir le téléphone*

---

## 5. Solution `search-base` — Chercher dans la base mémorielle

> **Cible** : tout le monde.
> **Énoncé du problème** : "J'ai déjà ingéré du contenu. Je veux poser une question en langage naturel et obtenir une réponse sourcée."

### Workflow

```
 1. Saisir la question (Claude Desktop)
    │ query/text
    ▼
 2. Embedder la question
    Reco : Mistral embed API
    Alt  : BGE-M3 local
    ⚠️ Doit être le MÊME modèle qu'à l'ingestion
    │ embedding/dense
    ▼
 3. Chercher dans l'index (Qdrant Cloud Free)
    │ query/topk
    ▼
 4. Réordonner par qualité (reranking)
    ⚠️ Catégorie cat-query-rerank actuellement VIDE → à seeder (BGE-Reranker-v2)
    │ query/reranked
    ▼
 5. Composer le prompt + générer (LangChain)
    │ query/prompt → query/answer
    ▼
 6. Router vers le bon LLM (LiteLLM cascade T1→T2)
    Reco : LiteLLM self-host + cascade
    Alt  : LiteLLM + vLLM on-prem
    Économie ~70% via cascade
    │
    ▼
 [Réponse affichée dans Claude Desktop]
```

### Dette identifiée

L'étape 4 (reranking) n'a **aucune brique recommandée** car la catégorie
`cat-query-rerank` est vide. À seeder en Lot 2 :
- BGE-Reranker-v2 (BAAI, OSS)
- Cohere Rerank API
- RankZephyr (OSS)

---

## 6. Comment ajouter une nouvelle solution

Procédure standard via l'admin :

1. Aller sur `/admin/solutions/new`
2. Remplir le formulaire principal (titre, problem_statement, audience, complexité, prix estimé, emoji)
3. Statut `draft` au début, puis `validated` quand prête
4. Sauvegarder → redirection vers `/admin/solutions/[id]/edit`
5. Ajouter les étapes une par une via "+ Nouvelle étape" :
   - position (1, 2, 3...)
   - titre + description
   - catégorie requise (dropdown groupé par rang)
   - brique recommandée (dropdown groupé par catégorie)
   - alternatives (checkboxes par catégorie)
   - ports in/out (dropdowns groupés par family)
   - notes de décision
6. Repasser `status='validated'` quand toutes les étapes sont là
7. La solution apparaît automatiquement sur `/`

---

## 7. Solutions à créer en Lot 2 (suggestions)

| Slug suggéré | Titre | Justification |
|---|---|---|
| `memo-mail` | Mémoriser un mail | Boîte mail = 90% du contexte d'un freelance |
| `memo-conversation` | Mémoriser une conversation chat | Slack, WhatsApp, Discord |
| `memo-screenshot` | Mémoriser une capture d'écran | Variante de memo-image, ciblée UI/dashboards |
| `detect-conflict` | Détecter un conflit d'intérêts | Démontre le moat F8 fiduciaire |
| `postmortem-outille` | Postmortem outillé | Démontre les modules `prereg` + `reversal` |
| `migrer-vault-existant` | Migrer un vault Obsidian existant | Pour les utilisateurs déjà dans le monde de la prise de notes |

---

## 8. Quelques chiffres sur les ratings actuels

| Indicateur | Valeur |
|---|---|
| Total ratings | 16 |
| Briques notées | 13 sur 44 (30%) |
| Briques sans rating | 28 sur 44 (64%) |
| Score moyen | 4.0 / 5 |
| Coûts les plus bas | Tesseract OCR, Whisper local, briques OSS (0 €) |
| Coûts les plus hauts | Plaud (14 €/mois fixe) |

**Action prioritaire** : compléter les ratings pour les 28 briques sans note,
sinon les solutions affichent des alternatives sans argument de choix.

---

## 9. À retenir en une phrase

> **4 solutions live (memo-image, memo-pdf, memo-meeting, search-base)
> = 22 étapes documentées, 16 ratings argumentés, prêtes pour des visiteurs
> réels. La cinquième à seeder dépend du segment qu'Erwan veut conquérir
> en premier.**
