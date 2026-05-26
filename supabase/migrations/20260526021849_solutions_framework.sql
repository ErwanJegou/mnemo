-- ============================================================================
-- Solutions framework — pivot orienté problème
-- ============================================================================
-- Le catalogue de briques était une bibliothèque (toutes les pièces). Cette
-- migration ajoute la couche au-dessus : les SOLUTIONS, c'est-à-dire des
-- workflows nommés orientés problème ("Mémoriser une image", "Transcrire une
-- réunion"…). Chaque solution liste ses étapes, et pour chaque étape : la
-- brique recommandée + ses alternatives avec leur note qualité/prix.
--
-- Ajoute aussi :
--   • ~25 briques manquantes (OCR, Vision, transcription, structure,
--     pipeline d'orchestration, stockage objet/blob)
--   • 14 nouveaux vendors (OpenAI, Google AI, IBM, Hugging Face, AssemblyAI,
--     Plaud, Unstructured, LlamaIndex, MinIO, n8n, Trigger.dev, VikParuchuri,
--     Synology, Apple)
--   • 1 nouvelle catégorie : cat-storage-blob (stockage objet/fichier)
--   • Une notation qualité/prix par cas d'usage (brick_quality_ratings)
--
-- RLS sur toutes les nouvelles tables, write blocked (service role seulement).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Nouvelle catégorie : Stockage objet/blob
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.brick_categories (slug, name, rank, position, description) values
  ('cat-storage-blob', 'Stockage objet / blob', 'storage', 5,
   'Stockage des fichiers binaires (images, PDF, audio originaux). S3-compatible ou dossier local.');

-- ─────────────────────────────────────────────────────────────────────────────
-- Nouveaux vendors
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.vendors (slug, name, country, sovereignty_zone, website, contact_email, notes) values
  ('openai',          'OpenAI',                  'US', 'us', 'https://openai.com',         'sales@openai.com',          'API GPT, Whisper, embeddings.'),
  ('google-ai',       'Google AI',               'US', 'us', 'https://ai.google.dev',      null,                        'API Gemini (texte, vision, embeddings).'),
  ('ibm-research',    'IBM Research',            'US', 'us', 'https://research.ibm.com',   null,                        'Modèles OSS dont Docling (extraction de PDF complexes).'),
  ('vikparuchuri',    'VikParuchuri (Marker)',   'US', 'other', 'https://github.com/VikParuchuri/marker', null,         'Marker : conversion PDF → markdown via deep learning, OSS.'),
  ('huggingface',     'Hugging Face',            'US', 'us', 'https://huggingface.co',     'sales@huggingface.co',      'Hub de modèles OSS : Florence-2, LLaVA, Qwen2-VL, BGE.'),
  ('assemblyai',      'AssemblyAI',              'US', 'us', 'https://www.assemblyai.com', 'sales@assemblyai.com',      'API transcription audio temps réel + analyse.'),
  ('plaud',           'Plaud',                   'US', 'us', 'https://plaud.ai',           'hello@plaud.ai',            'Enregistreur audio physique + transcription cloud.'),
  ('unstructured-io', 'Unstructured.io',         'US', 'us', 'https://unstructured.io',    'sales@unstructured.io',     'Extraction structurée (tableaux, formulaires) depuis PDF/Word/HTML.'),
  ('llamaindex',      'LlamaIndex',              'US', 'us', 'https://llamaindex.ai',      'sales@llamaindex.ai',       'LlamaParse : parsing PDF avec préservation de structure.'),
  ('minio',           'MinIO',                   'US', 'us', 'https://min.io',             'sales@min.io',              'Stockage objet S3-compatible self-host.'),
  ('n8n',             'n8n',                     'DE', 'eu', 'https://n8n.io',             'hello@n8n.io',              'Plateforme d''automatisation visuelle, OSS self-host ou cloud.'),
  ('trigger-dev',     'Trigger.dev',             'GB', 'other', 'https://trigger.dev',     'hello@trigger.dev',         'Workflows durables long-running, TypeScript-first.'),
  ('apple',           'Apple',                   'US', 'us', 'https://www.apple.com',      null,                        'Système / écosystème (Mac Mini, Finder, dossier local).'),
  ('synology',        'Synology',                'TW', 'other', 'https://www.synology.com', null,                       'NAS personnel pour stockage on-prem.');

-- ─────────────────────────────────────────────────────────────────────────────
-- Briques manquantes (~25)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.components (
  vendor_id, layer_id, category_id, slug, name, tier, description,
  pricing_model, base_price_eur, unit, pricing_url,
  preset_fit, capabilities, source_url, last_checked_at, confidence, status, notes
)
select v.id, x.layer_id, cat.id, x.slug, x.name, x.tier, x.description,
       x.pricing_model::public.pricing_model, x.base_price_eur, x.unit, x.pricing_url,
       x.preset_fit, x.capabilities::jsonb, x.source_url, x.last_checked_at::date,
       x.confidence::public.confidence_level, 'validated'::public.component_status, x.notes
from (values
  -- ── Pré-ingestion : OCR ────────────────────────────────────────────────────
  ('vikparuchuri',   0, 'cat-preingest-ocr', 'preingest-ocr-tesseract', 'Tesseract OCR (local)', 'OSS',
   'OCR open-source historique. Précision moyenne, gratuit, tourne partout.',
   'free', 0, 'gratuit', null,
   array['light','medium','hard'],
   '{"open_source":true,"on_prem":true,"languages":"100+"}',
   'https://github.com/tesseract-ocr/tesseract', '2026-05-26', 'high',
   'Référence pour les documents propres. Préférer Marker / Docling pour les PDF complexes.'),
  ('mistral-ai',     0, 'cat-preingest-ocr', 'preingest-ocr-mistral-api', 'Mistral OCR API', 'API',
   'OCR multilingue souverain UE, optimisé pour les documents structurés.',
   'usage', 0.001, 'page', 'https://mistral.ai/pricing',
   array['light','medium'],
   '{"managed":true,"sovereignty_eu":true,"languages":"40+"}',
   'https://mistral.ai/pricing', '2026-05-26', 'medium',
   'Excellent rapport qualité/prix sur factures, contrats, bons de commande.'),
  ('vikparuchuri',   0, 'cat-preingest-ocr', 'preingest-ocr-marker', 'Marker (PDF → markdown)', 'OSS',
   'Conversion PDF → markdown via deep learning (Surya). Préserve tables, équations, images.',
   'self_host', 0, 'gratuit', null,
   array['medium','hard'],
   '{"open_source":true,"on_prem":true,"gpu_optional":true,"preserves_tables":true,"preserves_equations":true}',
   'https://github.com/VikParuchuri/marker', '2026-05-26', 'high',
   'Le meilleur OSS pour PDF académiques / techniques avec tables et formules.'),
  ('ibm-research',   0, 'cat-preingest-ocr', 'preingest-ocr-docling', 'Docling (IBM)', 'OSS',
   'Extracteur PDF avancé IBM, gestion fine du layout. Pipeline complet PDF → JSON structuré.',
   'self_host', 0, 'gratuit', null,
   array['medium','hard'],
   '{"open_source":true,"on_prem":true,"sovereignty_neutral":true}',
   'https://github.com/DS4SD/docling', '2026-05-26', 'high',
   'Alternative à Marker, plus orienté entreprise. Bonne gestion des documents juridiques.'),

  -- ── Pré-ingestion : Vision LLM ────────────────────────────────────────────
  ('anthropic',      0, 'cat-preingest-vision', 'preingest-vision-claude', 'Claude Vision (Sonnet 4)', 'API',
   'Vision multimodale haut de gamme : description riche, OCR, raisonnement sur image.',
   'usage', 0.003, 'image', 'https://platform.claude.com/docs/en/about-claude/pricing',
   array['light','medium','hard'],
   '{"managed":true,"reasoning":true,"languages":"all"}',
   'https://platform.claude.com/docs/en/about-claude/pricing', '2026-05-26', 'high',
   'Le meilleur pour les scènes complexes nécessitant du raisonnement (schémas techniques, plans, captures dashboard).'),
  ('google-ai',      0, 'cat-preingest-vision', 'preingest-vision-gemini', 'Gemini 2.0 Vision', 'API',
   'Vision multimodale Google, très rapide, multimodal natif.',
   'usage', 0.0008, 'image', 'https://ai.google.dev/pricing',
   array['light','medium'],
   '{"managed":true,"fast":true,"multimodal_native":true}',
   'https://ai.google.dev/pricing', '2026-05-26', 'medium',
   'Excellent rapport qualité/prix pour le volume.'),
  ('openai',         0, 'cat-preingest-vision', 'preingest-vision-gpt4v', 'GPT-4o Vision', 'API',
   'Vision OpenAI, performante mais plus chère.',
   'usage', 0.005, 'image', 'https://openai.com/api/pricing',
   array['light','medium'],
   '{"managed":true,"reasoning":true}',
   'https://openai.com/api/pricing', '2026-05-26', 'medium',
   'Alternative à Claude Vision. Souveraineté US.'),
  ('huggingface',    0, 'cat-preingest-vision', 'preingest-vision-florence2', 'Florence-2 (local)', 'OSS',
   'Modèle vision Microsoft compact (0.23B / 0.77B), tourne sur CPU/GPU léger.',
   'self_host', 0, 'gratuit', null,
   array['medium','hard'],
   '{"open_source":true,"on_prem":true,"cpu_capable":true,"size_b":0.77}',
   'https://huggingface.co/microsoft/Florence-2-large', '2026-05-26', 'high',
   'Bon pour OCR + description basique en local. Léger.'),
  ('huggingface',    0, 'cat-preingest-vision', 'preingest-vision-llava', 'LLaVA 1.6 (local)', 'OSS',
   'Vision-language model OSS, plusieurs tailles (7B, 13B, 34B).',
   'self_host', 0, 'gratuit', null,
   array['hard'],
   '{"open_source":true,"on_prem":true,"gpu_required":true}',
   'https://llava-vl.github.io/', '2026-05-26', 'medium',
   'Nécessite GPU ≥ 16 Go pour 13B. Qualité correcte mais inférieure à Claude Vision.'),
  ('alibaba-qwen',   0, 'cat-preingest-vision', 'preingest-vision-qwen2vl', 'Qwen2-VL 7B (local)', 'OSS',
   'Vision-language model Alibaba, très bon en OCR multilingue et raisonnement visuel.',
   'self_host', 0, 'gratuit', null,
   array['hard'],
   '{"open_source":true,"on_prem":true,"gpu_required":true,"languages":"100+","ocr_strong":true}',
   'https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct', '2026-05-26', 'high',
   'Meilleur OSS multimodal en 2026. GPU 16 Go suffit pour 7B en INT4.'),

  -- ── Pré-ingestion : Transcription audio ──────────────────────────────────
  ('openai',         0, 'cat-preingest-transcribe', 'preingest-transcribe-whisper-local', 'Whisper Large-v3 (local)', 'OSS',
   'Transcription OpenAI OSS. Précision élevée, multilingue, gratuit.',
   'self_host', 0, 'gratuit', null,
   array['medium','hard'],
   '{"open_source":true,"on_prem":true,"languages":"99","gpu_optional":true}',
   'https://github.com/openai/whisper', '2026-05-26', 'high',
   'GPU recommandé pour temps réel, CPU OK pour batch.'),
  ('openai',         0, 'cat-preingest-transcribe', 'preingest-transcribe-whisper-api', 'Whisper API', 'API',
   'Whisper hébergé par OpenAI. Pas de souveraineté UE.',
   'usage', 0.006, 'minute', 'https://openai.com/api/pricing',
   array['light'],
   '{"managed":true,"languages":"99"}',
   'https://openai.com/api/pricing', '2026-05-26', 'high',
   'Simple à intégrer. Données envoyées aux USA.'),
  ('assemblyai',     0, 'cat-preingest-transcribe', 'preingest-transcribe-assemblyai', 'AssemblyAI Universal-2', 'API',
   'Transcription + diarization + sentiment. État de l''art sur multilingue.',
   'usage', 0.0037, 'minute', 'https://www.assemblyai.com/pricing',
   array['light','medium'],
   '{"managed":true,"diarization":true,"sentiment":true}',
   'https://www.assemblyai.com/pricing', '2026-05-26', 'high',
   'Meilleur pour les réunions multi-locuteurs.'),
  ('plaud',          0, 'cat-preingest-transcribe', 'preingest-transcribe-plaud', 'Plaud Note + cloud', 'Device + SaaS',
   'Enregistreur audio physique (collier / pin) + transcription auto.',
   'flat', 14, 'mois', 'https://plaud.ai/pages/pricing',
   array['light','medium'],
   '{"hardware":true,"managed":true,"languages":"112"}',
   'https://plaud.ai/pages/pricing', '2026-05-26', 'medium',
   'Hardware ~160 €. Idéal pour capture passive en réunion physique.'),

  -- ── Pré-ingestion : Extraction structure ────────────────────────────────
  ('unstructured-io',0, 'cat-preingest-structure', 'preingest-structure-unstructured', 'Unstructured.io API', 'API',
   'Extraction structure unifiée : PDF, DOCX, HTML, EML, images. Détection tables, formulaires, headers.',
   'usage', 0.005, 'page', 'https://unstructured.io/api-key',
   array['medium','hard'],
   '{"managed":true,"formats":"25+","detects_tables":true,"detects_forms":true}',
   'https://unstructured.io/pricing', '2026-05-26', 'medium',
   'Aussi disponible en OSS self-host (gratuit, plus complexe à déployer).'),
  ('llamaindex',     0, 'cat-preingest-structure', 'preingest-structure-llamaparse', 'LlamaParse', 'API',
   'Parsing PDF avec préservation fine de la structure, optimisé pour le RAG.',
   'usage', 0.003, 'page', 'https://www.llamaindex.ai/enterprise#pricing',
   array['medium','hard'],
   '{"managed":true,"rag_optimized":true,"preserves_tables":true}',
   'https://docs.cloud.llamaindex.ai/llamaparse/usage_data', '2026-05-26', 'medium',
   '7000 pages gratuites/semaine. Excellente qualité sur documents structurés.'),

  -- ── Ingestion : Pipeline d'orchestration ────────────────────────────────
  ('n8n',            0, 'cat-ingest-pipeline', 'ingest-pipeline-n8n-self', 'n8n self-host', 'OSS',
   'Automatisation visuelle (drag&drop), 400+ intégrations, exécution illimitée en self-host.',
   'self_host', 0, 'gratuit', null,
   array['light','medium','hard'],
   '{"open_source":true,"on_prem":true,"visual_editor":true,"integrations":"400+"}',
   'https://n8n.io/pricing', '2026-05-26', 'high',
   'La pièce maîtresse pour orchestrer pré-ingestion → embeddings → stockage sans coder.'),
  ('n8n',            0, 'cat-ingest-pipeline', 'ingest-pipeline-n8n-cloud', 'n8n Cloud Starter', 'Managed',
   'Même n8n, hébergé. 2.5k exécutions/mois en Starter.',
   'flat', 20, 'mois', 'https://n8n.io/pricing',
   array['light'],
   '{"managed":true,"visual_editor":true,"executions_per_month":2500}',
   'https://n8n.io/pricing', '2026-05-26', 'high',
   'Démarrer sans installer. Datacenters EU disponibles.'),
  ('trigger-dev',    0, 'cat-ingest-pipeline', 'ingest-pipeline-trigger-dev', 'Trigger.dev v3', 'Cloud / OSS',
   'Workflows durables TypeScript, parfait pour tâches longues (transcription, batch embeddings).',
   'usage', 0, 'gratuit', 'https://trigger.dev/pricing',
   array['medium','hard'],
   '{"open_source":true,"code_first":true,"long_running":true,"language":"typescript"}',
   'https://trigger.dev/pricing', '2026-05-26', 'medium',
   'Free tier : 10k runs/mois. Self-host possible.'),
  ('communaute-mnemo',0, 'cat-ingest-pipeline', 'ingest-pipeline-python-script', 'Script Python custom', 'Custom',
   'Script Python autonome (cron + bash). Maximum de contrôle, zéro dépendance externe.',
   'free', 0, 'gratuit', null,
   array['hard'],
   '{"open_source":true,"on_prem":true,"max_control":true,"language":"python"}',
   null, '2026-05-26', 'high',
   'Pour ceux qui veulent comprendre / auditer chaque ligne. Plus de code à maintenir.'),

  -- ── Stockage objet / blob ────────────────────────────────────────────────
  ('apple',          0, 'cat-storage-blob', 'storage-blob-local-folder', 'Dossier local (Finder/Files)', 'OS',
   'Dossier sur le disque local. Le plus simple. Pas de coût récurrent.',
   'free', 0, 'gratuit', null,
   array['light','medium','hard'],
   '{"open_source":true,"on_prem":true,"max_control":true}',
   null, '2026-05-26', 'high',
   'Combiner avec un backup (Restic + B2) pour la sécurité.'),
  ('supabase',       0, 'cat-storage-blob', 'storage-blob-supabase-storage', 'Supabase Storage', 'Managed',
   'Stockage objet S3-compatible managé, intégré à l''auth Supabase.',
   'flat', 0, 'mois', 'https://supabase.com/pricing',
   array['light'],
   '{"managed":true,"s3_compatible":true,"free_gb":1,"integrated_auth":true}',
   'https://supabase.com/pricing', '2026-05-26', 'high',
   'Free : 1 Go. Au-delà : ~0.021 €/Go/mois.'),
  ('minio',          0, 'cat-storage-blob', 'storage-blob-minio', 'MinIO (self-host)', 'OSS',
   'Stockage S3-compatible self-host, parfait pour on-prem.',
   'self_host', 0, 'gratuit', null,
   array['medium','hard'],
   '{"open_source":true,"on_prem":true,"s3_compatible":true}',
   'https://min.io/pricing', '2026-05-26', 'high',
   'Idéal sur NAS Synology ou serveur dédié.'),
  ('backblaze',      0, 'cat-storage-blob', 'storage-blob-backblaze-b2', 'Backblaze B2', 'SaaS',
   'Stockage objet ultra-bon-marché, S3-compatible.',
   'usage', 0.005, 'Go/mois', 'https://www.backblaze.com/cloud-storage/pricing',
   array['light','medium','hard'],
   '{"managed":true,"s3_compatible":true,"low_cost":true}',
   'https://www.backblaze.com/cloud-storage/pricing', '2026-05-26', 'high',
   'Souveraineté US. 10 Go gratuits.'),
  ('scaleway',       0, 'cat-storage-blob', 'storage-blob-scaleway-object', 'Scaleway Object Storage', 'SaaS',
   'Stockage objet S3-compatible souverain UE/FR.',
   'usage', 0.012, 'Go/mois', 'https://www.scaleway.com/en/pricing/storage/',
   array['light','medium','hard'],
   '{"managed":true,"s3_compatible":true,"sovereignty_eu":true}',
   'https://www.scaleway.com/en/pricing/storage/', '2026-05-26', 'high',
   '75 Go gratuits en MULTI_AZ.')
) as x(
  vendor_slug, layer_id, category_slug, slug, name, tier, description,
  pricing_model, base_price_eur, unit, pricing_url,
  preset_fit, capabilities, source_url, last_checked_at, confidence, notes
)
join public.vendors v on v.slug = x.vendor_slug
join public.brick_categories cat on cat.slug = x.category_slug;

-- ─────────────────────────────────────────────────────────────────────────────
-- Ports (in/out) pour les nouvelles briques
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.brick_ports (brick_id, port_type_id, direction, required, notes)
select c.id, p.id, x.direction::public.port_direction, x.required, x.notes
from (values
  -- OCR : in=file/pdf ou file/image, out=text/plain
  ('preingest-ocr-tesseract',     'file/image',     'in',  true,  null),
  ('preingest-ocr-tesseract',     'file/pdf',       'in',  false, null),
  ('preingest-ocr-tesseract',     'text/plain',     'out', true,  null),
  ('preingest-ocr-mistral-api',   'file/pdf',       'in',  true,  null),
  ('preingest-ocr-mistral-api',   'file/image',     'in',  false, null),
  ('preingest-ocr-mistral-api',   'text/markdown',  'out', true,  null),
  ('preingest-ocr-mistral-api',   'metadata/jsonld','out', false, null),
  ('preingest-ocr-marker',        'file/pdf',       'in',  true,  null),
  ('preingest-ocr-marker',        'text/markdown',  'out', true,  null),
  ('preingest-ocr-docling',       'file/pdf',       'in',  true,  null),
  ('preingest-ocr-docling',       'text/markdown',  'out', true,  null),
  ('preingest-ocr-docling',       'metadata/jsonld','out', true,  null),

  -- Vision : in=file/image, out=text/plain + metadata
  ('preingest-vision-claude',     'file/image',     'in',  true,  null),
  ('preingest-vision-claude',     'text/plain',     'out', true,  null),
  ('preingest-vision-claude',     'metadata/jsonld','out', false, null),
  ('preingest-vision-gemini',     'file/image',     'in',  true,  null),
  ('preingest-vision-gemini',     'text/plain',     'out', true,  null),
  ('preingest-vision-gpt4v',      'file/image',     'in',  true,  null),
  ('preingest-vision-gpt4v',      'text/plain',     'out', true,  null),
  ('preingest-vision-florence2',  'file/image',     'in',  true,  null),
  ('preingest-vision-florence2',  'text/plain',     'out', true,  null),
  ('preingest-vision-llava',      'file/image',     'in',  true,  null),
  ('preingest-vision-llava',      'text/plain',     'out', true,  null),
  ('preingest-vision-qwen2vl',    'file/image',     'in',  true,  null),
  ('preingest-vision-qwen2vl',    'text/plain',     'out', true,  null),
  ('preingest-vision-qwen2vl',    'metadata/jsonld','out', false, null),

  -- Transcription : in=file/audio, out=text/plain
  ('preingest-transcribe-whisper-local','file/audio','in', true, null),
  ('preingest-transcribe-whisper-local','text/plain','out', true, null),
  ('preingest-transcribe-whisper-api',  'file/audio','in', true, null),
  ('preingest-transcribe-whisper-api',  'text/plain','out', true, null),
  ('preingest-transcribe-assemblyai',   'file/audio','in', true, null),
  ('preingest-transcribe-assemblyai',   'text/plain','out', true, null),
  ('preingest-transcribe-assemblyai',   'metadata/jsonld','out', true, 'diarization, sentiment'),
  ('preingest-transcribe-plaud',        'file/audio','in', true, null),
  ('preingest-transcribe-plaud',        'text/plain','out', true, null),

  -- Structure : in=file/pdf, out=text/markdown + metadata
  ('preingest-structure-unstructured','file/pdf','in',  true, null),
  ('preingest-structure-unstructured','text/markdown','out', true, null),
  ('preingest-structure-unstructured','metadata/jsonld','out', true, null),
  ('preingest-structure-llamaparse',  'file/pdf','in',  true, null),
  ('preingest-structure-llamaparse',  'text/markdown','out', true, null),
  ('preingest-structure-llamaparse',  'metadata/jsonld','out', true, null),

  -- Pipeline : in=tout, out=tout (orchestrateur)
  ('ingest-pipeline-n8n-self',       'text/plain',     'in', false, 'pipeline orchestre, accepte tout'),
  ('ingest-pipeline-n8n-self',       'text/frontmatter','out', false, 'produit la fiche finale'),
  ('ingest-pipeline-n8n-cloud',      'text/plain',     'in', false, null),
  ('ingest-pipeline-n8n-cloud',      'text/frontmatter','out', false, null),
  ('ingest-pipeline-trigger-dev',    'text/plain',     'in', false, null),
  ('ingest-pipeline-trigger-dev',    'text/frontmatter','out', false, null),
  ('ingest-pipeline-python-script',  'text/plain',     'in', false, null),
  ('ingest-pipeline-python-script',  'text/frontmatter','out', false, null),

  -- Storage blob : in=file/*, out=storage/blob
  ('storage-blob-local-folder',     'file/image', 'in', false, null),
  ('storage-blob-local-folder',     'file/pdf',   'in', false, null),
  ('storage-blob-local-folder',     'file/audio', 'in', false, null),
  ('storage-blob-local-folder',     'storage/blob','out', true, null),
  ('storage-blob-supabase-storage', 'file/image', 'in', false, null),
  ('storage-blob-supabase-storage', 'file/pdf',   'in', false, null),
  ('storage-blob-supabase-storage', 'storage/blob','out', true, null),
  ('storage-blob-minio',            'file/image', 'in', false, null),
  ('storage-blob-minio',            'storage/blob','out', true, null),
  ('storage-blob-backblaze-b2',     'file/image', 'in', false, null),
  ('storage-blob-backblaze-b2',     'storage/blob','out', true, null),
  ('storage-blob-scaleway-object',  'file/image', 'in', false, null),
  ('storage-blob-scaleway-object',  'storage/blob','out', true, null)
) as x(brick_slug, port_slug, direction, required, notes)
join public.components c on c.slug = x.brick_slug
join public.port_types p on p.slug = x.port_slug;

-- ─────────────────────────────────────────────────────────────────────────────
-- Compatibilité infra pour les nouvelles briques (juste l'essentiel)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.brick_infra_targets (brick_id, infra_target_id, recommended, notes)
select c.id, i.id, x.recommended, x.notes
from (values
  -- APIs : SaaS uniquement (leur propre infra)
  ('preingest-ocr-mistral-api',   'saas-mistral-api',  true, null),
  ('preingest-vision-claude',     'saas-anthropic-api',true, null),
  ('preingest-vision-gpt4v',      'saas-anthropic-api',false, 'compatibilité technique, vendor différent'),
  -- Self-host OSS : VPS, bare metal, on-prem
  ('preingest-ocr-tesseract',     'vps-hetzner-cx22',  true, null),
  ('preingest-ocr-tesseract',     'on-prem-home',      true, null),
  ('preingest-ocr-marker',        'bm-hetzner-ax42',   true, 'GPU recommandé'),
  ('preingest-ocr-marker',        'on-prem-home',      true, null),
  ('preingest-ocr-docling',       'vps-hetzner-cx31',  true, null),
  ('preingest-ocr-docling',       'on-prem-home',      true, null),
  ('preingest-vision-florence2',  'vps-hetzner-cx31',  false, 'CPU lent'),
  ('preingest-vision-florence2',  'on-prem-home',      true, null),
  ('preingest-vision-llava',      'gpu-runpod-a40',    true, null),
  ('preingest-vision-qwen2vl',    'gpu-runpod-a40',    true, null),
  ('preingest-vision-qwen2vl',    'on-prem-home',      false, 'si GPU ≥ 16Go'),
  ('preingest-transcribe-whisper-local','on-prem-home',true, null),
  ('preingest-transcribe-whisper-local','bm-hetzner-ax42',true,'GPU = temps réel'),
  ('ingest-pipeline-n8n-self',    'vps-hetzner-cx22',  true, null),
  ('ingest-pipeline-n8n-self',    'on-prem-home',      true, null),
  ('ingest-pipeline-python-script','on-prem-home',     true, null),
  ('storage-blob-local-folder',   'on-prem-home',      true, null),
  ('storage-blob-supabase-storage','saas-supabase-free',true, null),
  ('storage-blob-minio',          'vps-hetzner-cx31',  true, null),
  ('storage-blob-minio',          'on-prem-home',      true, 'parfait sur NAS Synology')
) as x(brick_slug, infra_slug, recommended, notes)
join public.components c on c.slug = x.brick_slug
join public.infra_targets i on i.slug = x.infra_slug;

-- ============================================================================
-- TABLE : brick_quality_ratings (notation contextuelle qualité/prix)
-- ============================================================================
-- Notre travail : noter chaque brique sur des cas d'usage concrets.
-- "Mistral OCR sur facture" = 5/5, "Mistral OCR sur photo de paysage" = 1/5.
-- ============================================================================

create table public.brick_quality_ratings (
  id              uuid primary key default gen_random_uuid(),
  brick_id        uuid not null references public.components (id) on delete cascade,
  use_case        text not null,                  -- "OCR facture", "Vision schéma"…
  score           smallint not null check (score between 1 and 5),
  cost_per_op_eur numeric(12, 6),
  cost_unit       text,                            -- "page", "image", "minute", "1k_tokens"
  notes           text,
  source          text not null default 'internal' check (source in ('internal', 'user_report', 'vendor_doc')),
  rated_at        date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (brick_id, use_case)
);

create index brick_quality_ratings_brick_idx on public.brick_quality_ratings (brick_id);
create index brick_quality_ratings_use_case_idx on public.brick_quality_ratings (use_case);

create trigger brick_quality_ratings_touch before update on public.brick_quality_ratings
  for each row execute function public.touch_updated_at();

alter table public.brick_quality_ratings enable row level security;
create policy brick_quality_ratings_select on public.brick_quality_ratings
  for select to anon, authenticated using (
    exists (select 1 from public.components c where c.id = brick_id and c.status = 'validated')
  );

-- ============================================================================
-- TABLES : solutions + solution_steps (workflows orientés problème)
-- ============================================================================

create table public.solutions (
  id                         uuid primary key default gen_random_uuid(),
  slug                       text not null unique,
  title                      text not null,           -- "Mémoriser une image"
  problem_statement          text not null,           -- "J'ai des images, je veux les retrouver"
  audience                   text,                    -- "Tout le monde", "Cabinet régulé"…
  complexity                 text not null default 'medium' check (complexity in ('easy', 'medium', 'hard')),
  total_price_estimate_eur   numeric(12, 4),
  estimated_setup_minutes    integer,
  status                     public.component_status not null default 'draft',
  hero_emoji                 text,                    -- "📸"
  hero_color                 text,                    -- couleur d'accent (slug)
  position                   smallint not null default 0,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index solutions_status_idx on public.solutions (status, position);

create table public.solution_steps (
  id                       uuid primary key default gen_random_uuid(),
  solution_id              uuid not null references public.solutions (id) on delete cascade,
  position                 smallint not null,
  title                    text not null,           -- "Comprendre l'image"
  description              text,
  required_category_id     uuid references public.brick_categories (id) on delete set null,
  recommended_brick_id     uuid references public.components (id) on delete set null,
  alternative_brick_ids    uuid[] not null default '{}',
  input_port_id            uuid references public.port_types (id) on delete set null,
  output_port_id           uuid references public.port_types (id) on delete set null,
  decision_notes           text,                    -- "Choisir Vision LLM si scène, OCR si doc scanné"
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (solution_id, position)
);

create index solution_steps_solution_idx on public.solution_steps (solution_id, position);

create trigger solutions_touch before update on public.solutions
  for each row execute function public.touch_updated_at();
create trigger solution_steps_touch before update on public.solution_steps
  for each row execute function public.touch_updated_at();

alter table public.solutions       enable row level security;
alter table public.solution_steps  enable row level security;

create policy solutions_select_validated on public.solutions
  for select to anon, authenticated using (status = 'validated');
create policy solution_steps_select on public.solution_steps
  for select to anon, authenticated using (
    exists (select 1 from public.solutions s where s.id = solution_id and s.status = 'validated')
  );

-- ============================================================================
-- SEED — Quality ratings (10-15 ratings clés pour démonstration)
-- ============================================================================

insert into public.brick_quality_ratings (brick_id, use_case, score, cost_per_op_eur, cost_unit, notes, source, rated_at)
select c.id, x.use_case, x.score, x.cost_per_op_eur, x.cost_unit, x.notes, x.source, x.rated_at::date
from (values
  -- OCR
  ('preingest-ocr-tesseract',    'OCR facture imprimée propre',     4, 0,       'page',    'Excellent sur texte net.', 'internal', '2026-05-26'),
  ('preingest-ocr-tesseract',    'OCR document manuscrit',          1, 0,       'page',    'Inutilisable sur écriture manuscrite.', 'internal', '2026-05-26'),
  ('preingest-ocr-mistral-api',  'OCR facture imprimée propre',     5, 0.001,   'page',    'Sortie markdown structurée, rapide.', 'internal', '2026-05-26'),
  ('preingest-ocr-mistral-api',  'OCR PDF académique avec tables',  4, 0.001,   'page',    'Bon mais Marker préserve mieux les formules.', 'internal', '2026-05-26'),
  ('preingest-ocr-marker',       'OCR PDF académique avec tables',  5, 0,       'page',    'Référence OSS pour ce cas.', 'internal', '2026-05-26'),
  ('preingest-ocr-marker',       'OCR facture imprimée propre',     4, 0,       'page',    'Fonctionne, mais surdimensionné.', 'internal', '2026-05-26'),

  -- Vision
  ('preingest-vision-claude',    'Description scène complexe',      5, 0.003,   'image',   'Raisonnement contextuel exceptionnel.', 'internal', '2026-05-26'),
  ('preingest-vision-claude',    'OCR sur capture d''écran',        5, 0.003,   'image',   'Bonne lecture des UI complexes.', 'internal', '2026-05-26'),
  ('preingest-vision-gemini',    'Description scène complexe',      4, 0.0008,  'image',   'Très bon rapport qualité/prix.', 'internal', '2026-05-26'),
  ('preingest-vision-florence2', 'OCR sur capture d''écran',        3, 0,       'image',   'Correct, limite sur les petits caractères.', 'internal', '2026-05-26'),
  ('preingest-vision-qwen2vl',   'Description scène complexe',      4, 0,       'image',   'Meilleur OSS multimodal local.', 'internal', '2026-05-26'),
  ('preingest-vision-qwen2vl',   'OCR multilingue (CN/AR/JP)',      5, 0,       'image',   'Excellent sur langues non-latines.', 'internal', '2026-05-26'),

  -- Transcription
  ('preingest-transcribe-whisper-local',  'Transcription FR voix claire (1 locuteur)', 5, 0,       'minute', 'Whisper Large-v3 gratuit, qualité top.', 'internal', '2026-05-26'),
  ('preingest-transcribe-whisper-local',  'Transcription réunion 5 locuteurs',         3, 0,       'minute', 'Pas de diarization native.', 'internal', '2026-05-26'),
  ('preingest-transcribe-assemblyai',     'Transcription réunion 5 locuteurs',         5, 0.0037,  'minute', 'Diarization + sentiment intégrés.', 'internal', '2026-05-26'),
  ('preingest-transcribe-plaud',          'Capture passive RDV physique',              5, 14,      'mois',   'Hardware ~160 € + abo. Pas besoin de sortir le téléphone.', 'internal', '2026-05-26')
) as x(brick_slug, use_case, score, cost_per_op_eur, cost_unit, notes, source, rated_at)
join public.components c on c.slug = x.brick_slug;

-- ============================================================================
-- SEED — 4 solutions complètes
-- ============================================================================

insert into public.solutions (slug, title, problem_statement, audience, complexity,
                              total_price_estimate_eur, estimated_setup_minutes, status,
                              hero_emoji, hero_color, position) values
  ('memo-image',
   'Mémoriser une image',
   'J''ai des photos, captures d''écran, schémas. Je veux pouvoir les retrouver plus tard avec leur contexte (description, date, source).',
   'Tout le monde',
   'easy',
   25, 30, 'validated',
   '📸', 'primary', 1),

  ('memo-pdf',
   'Mémoriser un PDF',
   'J''ai des factures, contrats, rapports en PDF. Je veux les indexer pour les retrouver par contenu (pas juste par nom de fichier).',
   'Freelances, cabinets',
   'easy',
   20, 45, 'validated',
   '📄', 'secondary', 2),

  ('memo-meeting',
   'Mémoriser une réunion',
   'J''ai un enregistrement audio de réunion / RDV. Je veux la transcription, les actions à faire et une fiche cherchable.',
   'Consultants, cabinets',
   'medium',
   35, 60, 'validated',
   '🎤', 'tertiary', 3),

  ('search-base',
   'Chercher dans ma base mémorielle',
   'J''ai déjà ingéré du contenu. Je veux pouvoir poser une question en langage naturel et obtenir une réponse sourcée.',
   'Tout le monde',
   'medium',
   30, 30, 'validated',
   '🔍', 'primary', 4);

-- ─────────────────────────────────────────────────────────────────────────────
-- Étapes de chaque solution
-- ─────────────────────────────────────────────────────────────────────────────

-- Solution 1 : Mémoriser une image
insert into public.solution_steps (solution_id, position, title, description,
                                    required_category_id, recommended_brick_id,
                                    alternative_brick_ids, input_port_id, output_port_id, decision_notes)
select s.id, x.position, x.title, x.description,
       cat.id, reco.id,
       coalesce(array_agg(alt.id) filter (where alt.id is not null), '{}'::uuid[]),
       inp.id, outp.id, x.decision_notes
from (values
  ('memo-image', 1, 'Comprendre l''image',
   'Extraire une description textuelle de ce que contient l''image.',
   'cat-preingest-vision', 'preingest-vision-claude',
   array['preingest-vision-gemini','preingest-vision-qwen2vl','preingest-vision-florence2'],
   'file/image', 'text/plain',
   'Claude Vision si vous voulez le top de qualité (raisonnement). Gemini pour le volume. Qwen2-VL ou Florence-2 si vous voulez du 100% local.'),
  ('memo-image', 2, 'Stocker l''image originale',
   'Conserver le fichier image pour pouvoir le réafficher avec sa description.',
   'cat-storage-blob', 'storage-blob-local-folder',
   array['storage-blob-supabase-storage','storage-blob-backblaze-b2','storage-blob-minio'],
   'file/image', 'storage/blob',
   'Dossier local le plus simple. Supabase Storage si vous voulez l''image accessible depuis le web.'),
  ('memo-image', 3, 'Assembler la fiche mémoire',
   'Construire un fichier markdown avec frontmatter YAML qui combine description + métadonnées + lien vers l''image.',
   'cat-ingest-schema', 'c0-frontmatter-xavier-v1',
   '{}'::text[],
   'text/plain', 'text/frontmatter',
   'Contrat de données universel Mnémo. Garde la cohérence entre toutes vos fiches.'),
  ('memo-image', 4, 'Orchestrer le pipeline',
   'Lancer les 3 étapes ci-dessus automatiquement quand une nouvelle image arrive.',
   'cat-ingest-pipeline', 'ingest-pipeline-n8n-self',
   array['ingest-pipeline-n8n-cloud','ingest-pipeline-python-script'],
   'text/plain', 'text/frontmatter',
   'n8n self-host : visuel + gratuit. n8n cloud si vous ne voulez rien installer. Script Python pour les puristes.'),
  ('memo-image', 5, 'Embedder pour la recherche',
   'Transformer la description en vecteur pour recherche sémantique future.',
   'cat-ingest-embeddings', 'c4-light-mistral-embed-api',
   array['c4-medium-bge-m3-local'],
   'text/chunked', 'embedding/dense',
   'Mistral API si vous êtes en ligne. BGE-M3 local pour la souveraineté.'),
  ('memo-image', 6, 'Stocker l''embedding',
   'Indexer le vecteur pour pouvoir le rechercher.',
   'cat-storage-vector', 'c3-light-qdrant-cloud-free',
   array['c5-light-postgres-pgvector-supabase'],
   'embedding/dense', 'storage/vector',
   'Qdrant Cloud Free Tier pour démarrer (1 Go). pgvector si vous avez déjà Postgres.')
) as x(solution_slug, position, title, description, category_slug, reco_slug, alt_slugs, input_slug, output_slug, decision_notes)
join public.solutions s on s.slug = x.solution_slug
left join public.brick_categories cat on cat.slug = x.category_slug
left join public.components reco on reco.slug = x.reco_slug
left join public.port_types inp on inp.slug = x.input_slug
left join public.port_types outp on outp.slug = x.output_slug
left join public.components alt on alt.slug = any(x.alt_slugs)
group by s.id, x.position, x.title, x.description, cat.id, reco.id, inp.id, outp.id, x.decision_notes;

-- Solution 2 : Mémoriser un PDF
insert into public.solution_steps (solution_id, position, title, description,
                                    required_category_id, recommended_brick_id,
                                    alternative_brick_ids, input_port_id, output_port_id, decision_notes)
select s.id, x.position, x.title, x.description, cat.id, reco.id,
       coalesce(array_agg(alt.id) filter (where alt.id is not null), '{}'::uuid[]),
       inp.id, outp.id, x.decision_notes
from (values
  ('memo-pdf', 1, 'Extraire texte + structure',
   'Convertir le PDF en markdown propre, en préservant tables et formules.',
   'cat-preingest-ocr', 'preingest-ocr-marker',
   array['preingest-ocr-docling','preingest-ocr-mistral-api','preingest-structure-llamaparse','preingest-structure-unstructured'],
   'file/pdf', 'text/markdown',
   'Marker pour PDF académiques (tables + équations). Mistral OCR API pour factures. LlamaParse si vous voulez du SaaS optimisé RAG.'),
  ('memo-pdf', 2, 'Stocker le PDF original',
   'Garder le PDF source pour pouvoir le rouvrir.',
   'cat-storage-blob', 'storage-blob-local-folder',
   array['storage-blob-backblaze-b2','storage-blob-supabase-storage'],
   'file/pdf', 'storage/blob',
   null),
  ('memo-pdf', 3, 'Découper en chunks',
   'Diviser le texte extrait en morceaux indexables (par paragraphe ou section).',
   'cat-ingest-schema', 'c0-frontmatter-xavier-v1',
   '{}'::text[],
   'text/markdown', 'text/chunked',
   'Le contrat Xavier inclut la convention de chunking.'),
  ('memo-pdf', 4, 'Embedder',
   'Transformer chaque chunk en vecteur.',
   'cat-ingest-embeddings', 'c4-light-mistral-embed-api',
   array['c4-medium-bge-m3-local','c4-hard-qwen3-embed-7b-local'],
   'text/chunked', 'embedding/dense',
   null),
  ('memo-pdf', 5, 'Indexer',
   'Stocker chunks + embeddings pour la recherche.',
   'cat-storage-vector', 'c3-light-qdrant-cloud-free',
   array['c3-medium-qdrant-self-host-hybrid','c5-light-postgres-pgvector-supabase'],
   'embedding/dense', 'storage/vector',
   null)
) as x(solution_slug, position, title, description, category_slug, reco_slug, alt_slugs, input_slug, output_slug, decision_notes)
join public.solutions s on s.slug = x.solution_slug
left join public.brick_categories cat on cat.slug = x.category_slug
left join public.components reco on reco.slug = x.reco_slug
left join public.port_types inp on inp.slug = x.input_slug
left join public.port_types outp on outp.slug = x.output_slug
left join public.components alt on alt.slug = any(x.alt_slugs)
group by s.id, x.position, x.title, x.description, cat.id, reco.id, inp.id, outp.id, x.decision_notes;

-- Solution 3 : Mémoriser une réunion
insert into public.solution_steps (solution_id, position, title, description,
                                    required_category_id, recommended_brick_id,
                                    alternative_brick_ids, input_port_id, output_port_id, decision_notes)
select s.id, x.position, x.title, x.description, cat.id, reco.id,
       coalesce(array_agg(alt.id) filter (where alt.id is not null), '{}'::uuid[]),
       inp.id, outp.id, x.decision_notes
from (values
  ('memo-meeting', 1, 'Transcrire l''audio',
   'Convertir l''enregistrement audio en texte, idéalement avec identification des locuteurs.',
   'cat-preingest-transcribe', 'preingest-transcribe-assemblyai',
   array['preingest-transcribe-whisper-local','preingest-transcribe-whisper-api','preingest-transcribe-plaud'],
   'file/audio', 'text/plain',
   'AssemblyAI pour la diarization (5 € HT pour ~22h d''audio). Whisper local si souveraineté absolue. Plaud si vous voulez aussi le hardware d''enregistrement.'),
  ('memo-meeting', 2, 'Extraire les entités (personnes, dates, actions)',
   'Identifier qui a dit quoi, quelles sont les décisions, quelles actions à faire.',
   'cat-ingest-extract-entities', 'c5-medium-postgres-plus-graphiti',
   '{}'::text[],
   'text/plain', 'relations/triple',
   'Graphiti construit le graphe temporel automatiquement.'),
  ('memo-meeting', 3, 'Assembler la fiche réunion',
   'Markdown avec : participants, ordre du jour, résumé, transcription, actions.',
   'cat-ingest-schema', 'c0-frontmatter-xavier-v1',
   '{}'::text[],
   'text/plain', 'text/frontmatter',
   null),
  ('memo-meeting', 4, 'Stocker l''audio original',
   'Garder l''audio pour pouvoir réécouter un passage.',
   'cat-storage-blob', 'storage-blob-local-folder',
   array['storage-blob-backblaze-b2'],
   'file/audio', 'storage/blob',
   null),
  ('memo-meeting', 5, 'Embedder + indexer',
   'Découper la transcription en chunks, embedder, stocker dans Qdrant.',
   'cat-ingest-embeddings', 'c4-medium-bge-m3-local',
   array['c4-light-mistral-embed-api'],
   'text/chunked', 'embedding/dense',
   null)
) as x(solution_slug, position, title, description, category_slug, reco_slug, alt_slugs, input_slug, output_slug, decision_notes)
join public.solutions s on s.slug = x.solution_slug
left join public.brick_categories cat on cat.slug = x.category_slug
left join public.components reco on reco.slug = x.reco_slug
left join public.port_types inp on inp.slug = x.input_slug
left join public.port_types outp on outp.slug = x.output_slug
left join public.components alt on alt.slug = any(x.alt_slugs)
group by s.id, x.position, x.title, x.description, cat.id, reco.id, inp.id, outp.id, x.decision_notes;

-- Solution 4 : Chercher dans la base
insert into public.solution_steps (solution_id, position, title, description,
                                    required_category_id, recommended_brick_id,
                                    alternative_brick_ids, input_port_id, output_port_id, decision_notes)
select s.id, x.position, x.title, x.description, cat.id, reco.id,
       coalesce(array_agg(alt.id) filter (where alt.id is not null), '{}'::uuid[]),
       inp.id, outp.id, x.decision_notes
from (values
  ('search-base', 1, 'Saisir la question',
   'L''utilisateur tape une question en langage naturel.',
   'cat-surface-ui', 'c1-light-claude-desktop-pro',
   array['c1-medium-claude-desktop-plus-code','c1-hard-claude-desktop-plus-workbench'],
   'query/text', 'query/text',
   'Claude Desktop est la surface unique (MCP) recommandée.'),
  ('search-base', 2, 'Embedder la question',
   'Transformer la question en vecteur (même modèle que celui d''ingestion).',
   'cat-ingest-embeddings', 'c4-light-mistral-embed-api',
   array['c4-medium-bge-m3-local'],
   'text/plain', 'embedding/dense',
   '⚠️ Doit être le MÊME modèle qu''à l''ingestion, sinon les vecteurs ne sont pas comparables.'),
  ('search-base', 3, 'Chercher dans l''index',
   'Récupérer les top-K documents les plus proches.',
   'cat-storage-vector', 'c3-light-qdrant-cloud-free',
   array['c3-medium-qdrant-self-host-hybrid'],
   'embedding/dense', 'query/topk',
   null),
  ('search-base', 4, 'Réordonner par qualité',
   'Reranking : améliore la qualité du top-K (optionnel mais recommandé).',
   'cat-query-rerank', null,
   '{}'::text[],
   'query/topk', 'query/reranked',
   'Pas encore de brique reranking dédiée dans le catalogue (BGE-Reranker à seeder).'),
  ('search-base', 5, 'Composer le prompt + générer',
   'Assembler les docs trouvés en contexte, envoyer au LLM, retourner la réponse.',
   'cat-query-rag', 'c2-light-langchain',
   '{}'::text[],
   'query/reranked', 'query/answer',
   'LangChain compose le prompt RAG standard.'),
  ('search-base', 6, 'Router vers le bon LLM',
   'Choisir le LLM (cascade T1 → T2 si la question est complexe).',
   'cat-query-gateway', 'c2-medium-litellm-cascade',
   array['c2-hard-litellm-plus-vllm-onprem'],
   'query/prompt', 'query/answer',
   'LiteLLM économise jusqu''à 70% via cascade.')
) as x(solution_slug, position, title, description, category_slug, reco_slug, alt_slugs, input_slug, output_slug, decision_notes)
join public.solutions s on s.slug = x.solution_slug
left join public.brick_categories cat on cat.slug = x.category_slug
left join public.components reco on reco.slug = x.reco_slug
left join public.port_types inp on inp.slug = x.input_slug
left join public.port_types outp on outp.slug = x.output_slug
left join public.components alt on alt.slug = any(x.alt_slugs)
group by s.id, x.position, x.title, x.description, cat.id, reco.id, inp.id, outp.id, x.decision_notes;
