-- ============================================================================
-- Refonte taxonomie : briques génériques + ports typés + infra + hardware
-- ============================================================================
-- Sépare clairement :
--   • brick_categories  (18 catégories génériques, ex. "Stockage vectoriel")
--   • bricks (= ex-components, renommé sémantique) — une implémentation concrète
--     d'une catégorie par un vendor (ex. "Qdrant Cloud Free Tier")
--   • brick_ports       (in/out typés — base future du drag&drop)
--   • port_types        (catalogue des types de données qui transitent)
--   • infra_targets     (où héberger : VPS, bare metal, on-prem, SaaS)
--   • brick_infra_targets (compatibilité brique × infra)
--   • hardware_recipes  (bundles machine pour ceux qui partent on-prem)
--
-- On conserve la table `components` (pas de RENAME pour éviter de casser les
-- pages admin existantes pendant la transition — la prochaine migration la
-- renommera quand le code aura suivi). On lui ajoute juste `category_id` et
-- l'utilisation de brick_ports / brick_infra_targets.
--
-- RLS activée sur toutes les nouvelles tables (règle absolue AGENTS.md §4).
-- Writes via service role uniquement (pas de policy insert/update/delete).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Types énumérés
-- ─────────────────────────────────────────────────────────────────────────────

create type public.brick_rank as enum (
  'preingest', 'ingest', 'storage', 'query', 'ai', 'surface', 'ops'
);

create type public.port_direction as enum ('in', 'out');

create type public.infra_kind as enum (
  'vps_managed',     -- VPS managé (Hetzner Cloud, Scaleway, OVH, Hostinger…)
  'bare_metal',      -- Serveur dédié (Hetzner AX/EX, OVH BM, Dedibox…)
  'gpu_rented',      -- GPU à l'heure (RunPod, Vast.ai, Lambda Labs…)
  'on_prem',         -- Machine maison / au cabinet (NUC, Mac Mini, NAS…)
  'saas_managed'     -- Le vendor héberge tout (Qdrant Cloud, Mistral API…)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table : brick_categories (les 18 catégories génériques)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.brick_categories (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  rank         public.brick_rank not null,
  position     smallint not null default 0,  -- ordre dans le rang
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index brick_categories_rank_idx on public.brick_categories (rank, position);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table : port_types (catalogue des types de données échangés)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.port_types (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  family       text not null,    -- regroupement (file, text, embedding, …)
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index port_types_family_idx on public.port_types (family);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table : infra_targets (où peut tourner une brique)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.infra_targets (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  infra_kind        public.infra_kind not null,
  vendor_id         uuid references public.vendors (id) on delete set null,
  country           text,
  sovereignty_zone  public.sovereignty_zone not null default 'other',
  base_price_eur    numeric(12, 4) not null default 0,
  unit              text not null default 'mois',
  specs             jsonb not null default '{}'::jsonb,   -- CPU, RAM, GPU VRAM…
  source_url        text,
  last_checked_at   date,
  confidence        public.confidence_level not null default 'medium',
  status            public.component_status not null default 'validated',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index infra_targets_kind_idx on public.infra_targets (infra_kind);
create index infra_targets_zone_idx on public.infra_targets (sovereignty_zone);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table : hardware_recipes (bundles machine pour on-prem)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.hardware_recipes (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  name                text not null,
  use_case            text not null,    -- "RAG perso CPU", "Cabinet régulé GPU"…
  description         text,
  bom                 jsonb not null default '[]'::jsonb,    -- bill of materials [{ part, model, price, url }]
  total_price_eur     numeric(12, 4) not null default 0,
  purchase_url        text,             -- vendor principal (Amazon, Beelink store…)
  installer_notes     text,             -- "Compte 2h pour l'installer chez vous"
  status              public.component_status not null default 'validated',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER components : rattachement à une catégorie
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.components
  add column category_id uuid references public.brick_categories (id) on delete set null;

create index components_category_idx on public.components (category_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table : brick_ports (ports in/out typés)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.brick_ports (
  brick_id      uuid not null references public.components (id) on delete cascade,
  port_type_id  uuid not null references public.port_types   (id) on delete restrict,
  direction     public.port_direction not null,
  required      boolean not null default true,
  notes         text,
  primary key (brick_id, port_type_id, direction)
);

create index brick_ports_port_idx on public.brick_ports (port_type_id, direction);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table : brick_infra_targets (compatibilité brique × infra)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.brick_infra_targets (
  brick_id         uuid not null references public.components (id) on delete cascade,
  infra_target_id  uuid not null references public.infra_targets (id) on delete cascade,
  recommended      boolean not null default false,
  notes            text,
  primary key (brick_id, infra_target_id)
);

create index brick_infra_targets_target_idx on public.brick_infra_targets (infra_target_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers updated_at
-- ─────────────────────────────────────────────────────────────────────────────

create trigger brick_categories_touch before update on public.brick_categories
  for each row execute function public.touch_updated_at();
create trigger port_types_touch before update on public.port_types
  for each row execute function public.touch_updated_at();
create trigger infra_targets_touch before update on public.infra_targets
  for each row execute function public.touch_updated_at();
create trigger hardware_recipes_touch before update on public.hardware_recipes
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS : activée sur toutes les nouvelles tables, select public, write blocked
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.brick_categories      enable row level security;
alter table public.port_types            enable row level security;
alter table public.infra_targets         enable row level security;
alter table public.hardware_recipes      enable row level security;
alter table public.brick_ports           enable row level security;
alter table public.brick_infra_targets   enable row level security;

create policy brick_categories_select   on public.brick_categories
  for select to anon, authenticated using (true);
create policy port_types_select         on public.port_types
  for select to anon, authenticated using (true);
create policy infra_targets_select      on public.infra_targets
  for select to anon, authenticated using (status = 'validated');
create policy hardware_recipes_select   on public.hardware_recipes
  for select to anon, authenticated using (status = 'validated');
-- brick_ports / brick_infra_targets : lecture publique si la brique parente est validée
create policy brick_ports_select on public.brick_ports
  for select to anon, authenticated using (
    exists (select 1 from public.components c where c.id = brick_id and c.status = 'validated')
  );
create policy brick_infra_targets_select on public.brick_infra_targets
  for select to anon, authenticated using (
    exists (select 1 from public.components c where c.id = brick_id and c.status = 'validated')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED — 18 catégories de briques (7 rangs)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.brick_categories (slug, name, rank, position, description) values
  -- Rang 1 : pré-ingestion (transformer la matière brute en texte)
  ('cat-preingest-ocr',          'OCR / extraction texte',         'preingest', 1, 'Extraire le texte d''un PDF scanné ou d''une photo de document.'),
  ('cat-preingest-vision',       'Vision / description d''image',  'preingest', 2, 'Décrire ce qu''on voit sur une image (objets, scène, contexte).'),
  ('cat-preingest-transcribe',   'Transcription audio',            'preingest', 3, 'Convertir audio en texte (réunions, notes vocales).'),
  ('cat-preingest-structure',    'Extraction structure',           'preingest', 4, 'Détecter tableaux, formulaires, dates, métadonnées.'),

  -- Rang 2 : ingestion (mettre dans le système)
  ('cat-ingest-schema',          'Contrat de données / format pivot',  'ingest', 1, 'Schéma unifié des fiches (frontmatter YAML, JSON Schema, validation).'),
  ('cat-ingest-pipeline',        'Pipeline d''ingestion',              'ingest', 2, 'Orchestrer le flux fichier → base (scripts, n8n, Trigger.dev).'),
  ('cat-ingest-embeddings',      'Modèle d''embeddings',               'ingest', 3, 'Le modèle qui transforme un texte en vecteur dense.'),
  ('cat-ingest-extract-entities','Extraction entités/relations',       'ingest', 4, 'NER + extraction de triplets pour alimenter le graphe.'),

  -- Rang 3 : stockage (où vivent les données)
  ('cat-storage-vault',          'Vault source',           'storage', 1, 'Source de vérité humaine, éditable à la main (markdown, Obsidian).'),
  ('cat-storage-vector',         'Stockage vectoriel',     'storage', 2, 'Recherche par similarité sur les embeddings.'),
  ('cat-storage-relational',     'Stockage relationnel',   'storage', 3, 'Métadonnées, configurations, audit trail.'),
  ('cat-storage-graph',          'Stockage graphe / temporel', 'storage', 4, 'Relations entre concepts, bitemporalité.'),

  -- Rang 4 : requêtage
  ('cat-query-rag',              'Orchestrateur RAG',  'query', 1, 'Compose la requête : retrieve → rerank → prompt → generate.'),
  ('cat-query-rerank',           'Reranking',          'query', 2, 'Réordonner le top-K pour améliorer la qualité.'),
  ('cat-query-gateway',          'LLM Gateway',        'query', 3, 'Routeur + cascade T1→T2 + cache + observabilité.'),

  -- Rang 5 : IA
  ('cat-ai-llm',                 'LLM d''inférence',  'ai', 1, 'Le LLM lui-même (API hostée ou inférence locale).'),

  -- Rang 6 : surface
  ('cat-surface-ui',             'Surface utilisateur', 'surface', 1, 'Comment l''humain parle au système (chat MCP, IDE, UI web).'),

  -- Rang 7 : opérations
  ('cat-ops-backup',             'Backup / restauration', 'ops', 1, 'Snapshots, rétention 3-2-1, restore-test annuel.');

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED — port_types (catalogue des types de données qui transitent)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.port_types (slug, name, family, description) values
  -- file (matière brute)
  ('file/pdf',              'Fichier PDF',         'file',      'Document PDF (texte ou scan).'),
  ('file/image',            'Image',               'file',      'jpg, png, webp…'),
  ('file/audio',            'Fichier audio',       'file',      'mp3, wav, m4a…'),
  ('file/video',            'Fichier vidéo',       'file',      'mp4, mov…'),
  ('file/markdown',         'Fichier Markdown',    'file',      'Fichier .md (source de vérité du vault).'),

  -- text
  ('text/plain',            'Texte brut',          'text',      'Chaîne de caractères sans structure.'),
  ('text/markdown',         'Markdown rendu',      'text',      'Markdown structuré.'),
  ('text/frontmatter',      'Markdown + YAML',     'text',      'Fichier avec entête YAML conforme au contrat.'),
  ('text/chunked',          'Chunks indexables',   'text',      'Liste d''extraits prêts à être vectorisés.'),

  -- embedding
  ('embedding/dense',       'Embedding dense',         'embedding', 'Vecteur dense (cosinus).'),
  ('embedding/sparse',      'Embedding sparse',        'embedding', 'Vecteur sparse (BM25, SPLADE).'),
  ('embedding/multimodal',  'Embedding multimodal',    'embedding', 'Vecteur dense aligné texte/image/audio.'),

  -- structured
  ('entities/list',         'Liste d''entités',        'structured', 'Entités nommées extraites (personnes, lieux, dates…).'),
  ('relations/triple',      'Triplets sujet-prédicat-objet', 'structured', 'Pour alimenter un graphe.'),
  ('metadata/jsonld',       'Métadonnées JSON-LD',     'structured', 'Métadonnées sémantiques riches.'),

  -- query
  ('query/text',            'Question utilisateur',    'query', 'La question en langage naturel.'),
  ('query/topk',            'Top-K résultats',         'query', 'Documents ramenés par le retriever.'),
  ('query/reranked',        'Top-K rerankés',          'query', 'Documents réordonnés par qualité.'),
  ('query/prompt',          'Prompt final',            'query', 'Prompt complet envoyé au LLM.'),
  ('query/answer',          'Réponse LLM',             'query', 'Génération du LLM.'),

  -- storage_capacity (ce qu'un store offre comme capacité)
  ('storage/vector',        'Capacité stockage vectoriel',    'storage_capacity', 'La brique offre un index vectoriel.'),
  ('storage/relational',    'Capacité stockage relationnel',  'storage_capacity', 'La brique offre un store SQL.'),
  ('storage/graph',         'Capacité stockage graphe',       'storage_capacity', 'La brique offre un graphe de relations.'),
  ('storage/blob',          'Capacité stockage objet',        'storage_capacity', 'La brique offre du stockage de fichiers/blobs.');

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED — infra_targets (où héberger)
-- Vendors infra : Hetzner / Scaleway / OVH / Backblaze sont déjà dans vendors.
-- On ajoute Hostinger + RunPod.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.vendors (slug, name, country, sovereignty_zone, website, contact_email, notes) values
  ('hostinger',  'Hostinger',  'LT', 'eu',    'https://www.hostinger.com', 'support@hostinger.com', 'VPS KVM low-cost, Lituanie (UE).'),
  ('runpod',     'RunPod',     'US', 'us',    'https://www.runpod.io',     'sales@runpod.io',       'GPU cloud à l''heure.'),
  ('ovh',        'OVHcloud',   'FR', 'eu',    'https://www.ovh.com',       'sales@ovh.com',         'Cloud souverain français (vendors Scaleway/OVH distincts au Lot 1).');

insert into public.infra_targets (
  slug, name, infra_kind, vendor_id, country, sovereignty_zone,
  base_price_eur, unit, specs, source_url, last_checked_at, confidence, notes
)
select x.slug, x.name, x.infra_kind::public.infra_kind, v.id, x.country,
       x.sovereignty_zone::public.sovereignty_zone,
       x.base_price_eur, x.unit, x.specs::jsonb,
       x.source_url, x.last_checked_at::date, x.confidence::public.confidence_level, x.notes
from (values
  ('vps-hetzner-cx22', 'Hetzner Cloud CX22', 'vps_managed', 'hetzner', 'DE', 'eu',
   4.59, 'mois', '{"cpu_vcpu":2,"ram_gb":4,"disk_gb":40,"shared":true}',
   'https://www.hetzner.com/cloud', '2026-05-23', 'high',
   'VPS partagé Allemagne, IPv4 incluse. Excellent rapport qualité/prix.'),

  ('vps-hetzner-cx31', 'Hetzner Cloud CX31', 'vps_managed', 'hetzner', 'DE', 'eu',
   12.49, 'mois', '{"cpu_vcpu":4,"ram_gb":8,"disk_gb":80,"shared":true}',
   'https://www.hetzner.com/cloud', '2026-05-23', 'high',
   'VPS partagé, taille recommandée pour stack RAG self-host complète.'),

  ('vps-scaleway-stardust1-s', 'Scaleway Stardust1-S', 'vps_managed', 'scaleway', 'FR', 'eu',
   0.0024, 'heure', '{"cpu_vcpu":1,"ram_gb":1,"disk_gb":10,"shared":true}',
   'https://www.scaleway.com/en/pricing/virtual-instances-pricing/', '2026-05-23', 'high',
   'Très petit VPS dev/test, facturation à l''heure.'),

  ('vps-ovh-vps-comfort', 'OVH VPS Comfort', 'vps_managed', 'ovh', 'FR', 'eu',
   6.99, 'mois', '{"cpu_vcpu":2,"ram_gb":4,"disk_gb":80,"shared":false}',
   'https://www.ovhcloud.com/fr/vps/', '2026-05-23', 'high',
   'VPS dédié OVH France.'),

  ('vps-hostinger-kvm2', 'Hostinger VPS KVM 2', 'vps_managed', 'hostinger', 'LT', 'eu',
   5.99, 'mois', '{"cpu_vcpu":2,"ram_gb":8,"disk_gb":100,"shared":false}',
   'https://www.hostinger.com/vps-hosting', '2026-05-23', 'medium',
   'VPS KVM dédié low-cost, datacenter UE (Lituanie).'),

  ('bm-hetzner-ax42', 'Hetzner Dedicated AX42', 'bare_metal', 'hetzner', 'DE', 'eu',
   39.00, 'mois', '{"cpu":"Ryzen 7 PRO 7700","ram_gb":64,"disk":"2x 512Go NVMe","gpu":null}',
   'https://www.hetzner.com/dedicated-rootserver/', '2026-05-23', 'high',
   'Bare metal Ryzen, parfait pour bases lourdes + RAG self-host.'),

  ('gpu-runpod-a40', 'RunPod A40 (on-demand)', 'gpu_rented', 'runpod', 'US', 'us',
   0.39, 'heure', '{"gpu":"NVIDIA A40","gpu_vram_gb":48,"cpu_vcpu":9,"ram_gb":50}',
   'https://www.runpod.io/pricing', '2026-05-23', 'high',
   'GPU à l''heure pour inférence Qwen3-30B / Llama 70B.'),

  ('on-prem-home', 'On-prem maison', 'on_prem', null, null, 'eu',
   0, 'mois', '{}',
   null, '2026-05-23', 'high',
   'Machine personnelle / cabinet. Pas de coût récurrent d''infra (mais voir hardware_recipes).'),

  ('saas-supabase-free', 'Supabase Free Tier', 'saas_managed', 'supabase', 'SG', 'other',
   0, 'mois', '{"db_gb":0.5,"storage_gb":1,"bandwidth_gb":5}',
   'https://supabase.com/pricing', '2026-05-23', 'high',
   'Postgres + auth + storage managé gratuit (limite 0.5 Go).'),

  ('saas-qdrant-cloud-free', 'Qdrant Cloud Free Cluster', 'saas_managed', 'qdrant', 'DE', 'eu',
   0, 'mois', '{"vectors_gb":1,"shared":true}',
   'https://qdrant.tech/pricing/', '2026-05-23', 'high',
   'Cluster Qdrant managé gratuit (1 Go vecteurs).'),

  ('saas-mistral-api', 'Mistral La Plateforme', 'saas_managed', 'mistral-ai', 'FR', 'eu',
   0, 'mois', '{"pricing":"usage"}',
   'https://mistral.ai/pricing', '2026-05-23', 'high',
   'API LLM + embeddings souveraine UE, facturation à l''usage (pay-per-token).'),

  ('saas-anthropic-api', 'Anthropic API', 'saas_managed', 'anthropic', 'US', 'us',
   0, 'mois', '{"pricing":"usage"}',
   'https://platform.claude.com/docs/en/about-claude/pricing', '2026-05-23', 'high',
   'API Claude Sonnet/Opus/Haiku, facturation à l''usage.')
) as x(
  slug, name, infra_kind, vendor_slug, country, sovereignty_zone,
  base_price_eur, unit, specs, source_url, last_checked_at, confidence, notes
)
left join public.vendors v on v.slug = x.vendor_slug;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED — hardware_recipes (3 packs initiaux)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.hardware_recipes (
  slug, name, use_case, description, bom, total_price_eur, purchase_url, installer_notes
) values
  (
    'pack-cpu-rag-perso',
    'Pack RAG perso (CPU)',
    'Base mémorielle individuelle, CPU uniquement',
    'Mini-PC silencieux, parfait pour Postgres + Qdrant self-host + Restic. LLM via API externe (Mistral/Claude). Pas de GPU = pas d''inférence locale.',
    '[
      {"part":"Mini-PC","model":"Beelink SER7 7840HS","ram_gb":32,"disk_gb":2000,"price_eur":600,"vendor":"Beelink","url":"https://www.bee-link.com"},
      {"part":"SSD complémentaire","model":"Crucial P3 Plus 2 To NVMe","price_eur":100,"vendor":"Amazon","url":"https://www.amazon.fr"}
    ]'::jsonb,
    700,
    'https://www.bee-link.com',
    'Compter ~2h pour installer Debian + Docker + la stack. Un informaticien local le fait pour 100-150 €.'
  ),
  (
    'pack-mini-gpu',
    'Pack RAG souverain (GPU léger)',
    'Cabinet régulé qui veut une part d''inférence locale (embeddings BGE-M3, petits LLM)',
    'Mac Mini M4 24Go : SoC Apple Silicon avec 16 cœurs Neural Engine, capable d''exécuter BGE-M3 + petits LLM (Mistral 7B, Llama 3.2 3B) sans GPU dédié.',
    '[
      {"part":"Mac Mini","model":"Apple Mac Mini M4 24Go/512Go","price_eur":1499,"vendor":"Apple","url":"https://www.apple.com/fr/shop/buy-mac/mac-mini"}
    ]'::jsonb,
    1499,
    'https://www.apple.com/fr/shop/buy-mac/mac-mini',
    'Plug-and-play. Compter 3h pour configurer + déployer la stack via Docker.'
  ),
  (
    'pack-gpu-cabinet',
    'Pack cabinet régulé (GPU sérieux)',
    'Cabinet avocat/santé qui veut un LLM local (Qwen3-30B) air-gap complet',
    'Tour custom CPU + GPU 24 Go : permet l''inférence de Qwen3-30B AWQ ou Llama 3.3 70B INT4 en local, totalement déconnectable d''Internet.',
    '[
      {"part":"CPU","model":"AMD Ryzen 7 7700","price_eur":300,"vendor":"LDLC","url":"https://www.ldlc.com"},
      {"part":"Carte mère","model":"ASUS B650-Plus","price_eur":180,"vendor":"LDLC","url":"https://www.ldlc.com"},
      {"part":"RAM","model":"64Go DDR5 6000 MT/s","price_eur":250,"vendor":"LDLC","url":"https://www.ldlc.com"},
      {"part":"GPU","model":"NVIDIA RTX 4090 24Go","price_eur":1800,"vendor":"LDLC","url":"https://www.ldlc.com"},
      {"part":"SSD","model":"Samsung 990 Pro 4 To NVMe","price_eur":350,"vendor":"LDLC","url":"https://www.ldlc.com"},
      {"part":"Alimentation","model":"Corsair RM850x 850W","price_eur":140,"vendor":"LDLC","url":"https://www.ldlc.com"},
      {"part":"Boîtier","model":"Fractal Design North","price_eur":120,"vendor":"LDLC","url":"https://www.ldlc.com"}
    ]'::jsonb,
    3140,
    'https://www.ldlc.com',
    'Montage par assembleur LDLC (~200 € + transport) OU informaticien local (~300 €). Installation logicielle 4-6h.'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REMAPPING : rattacher chaque composant existant à sa catégorie
-- ─────────────────────────────────────────────────────────────────────────────

update public.components c set category_id = cat.id
from public.brick_categories cat
where (cat.slug, c.slug) in (
  -- Frontmatter Xavier → contrat de données
  ('cat-ingest-schema',            'c0-frontmatter-xavier-v1'),

  -- Surfaces (Claude Desktop x3) → surface utilisateur
  ('cat-surface-ui',               'c1-light-claude-desktop-pro'),
  ('cat-surface-ui',               'c1-medium-claude-desktop-plus-code'),
  ('cat-surface-ui',               'c1-hard-claude-desktop-plus-workbench'),

  -- LangChain → orchestrateur RAG ; LiteLLM x2 → LLM Gateway
  ('cat-query-rag',                'c2-light-langchain'),
  ('cat-query-gateway',            'c2-medium-litellm-cascade'),
  ('cat-query-gateway',            'c2-hard-litellm-plus-vllm-onprem'),

  -- Qdrant x3 → stockage vectoriel
  ('cat-storage-vector',           'c3-light-qdrant-cloud-free'),
  ('cat-storage-vector',           'c3-medium-qdrant-self-host-hybrid'),
  ('cat-storage-vector',           'c3-hard-qdrant-onprem-airgapped'),

  -- Embeddings x3 → modèle d'embeddings
  ('cat-ingest-embeddings',        'c4-light-mistral-embed-api'),
  ('cat-ingest-embeddings',        'c4-medium-bge-m3-local'),
  ('cat-ingest-embeddings',        'c4-hard-qwen3-embed-7b-local'),

  -- Supabase Postgres → stockage relationnel
  ('cat-storage-relational',       'c5-light-postgres-pgvector-supabase'),
  -- Graphiti (bundle pg+graphiti) → extraction entités/relations (rôle dominant)
  ('cat-ingest-extract-entities',  'c5-medium-postgres-plus-graphiti'),
  -- XTDB → stockage graphe/temporel
  ('cat-storage-graph',            'c5-hard-xtdb-plus-graphiti'),

  -- Packs C6 → LLM d'inférence (rôle dominant). À éclater en briques unitaires
  -- au Lot 2 (Mistral API / vLLM+Qwen / Anthropic + briques backup séparées).
  ('cat-ai-llm',                   'c6-light-mistral-plus-scaleway-plus-b2'),
  ('cat-ai-llm',                   'c6-medium-mistral-plus-hetzner-plus-3-2-1'),
  ('cat-ai-llm',                   'c6-hard-vllm-onprem-plus-luks')
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED — brick_ports (in/out typés par brique existante)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.brick_ports (brick_id, port_type_id, direction, required, notes)
select c.id, p.id, x.direction::public.port_direction, x.required, x.notes
from (values
  -- Frontmatter Xavier : in=file/markdown, out=text/frontmatter
  ('c0-frontmatter-xavier-v1', 'file/markdown',    'in',  true,  null),
  ('c0-frontmatter-xavier-v1', 'text/frontmatter', 'out', true,  null),

  -- Surfaces Claude Desktop : in=query/answer (affiche), out=query/text (saisit)
  ('c1-light-claude-desktop-pro',          'query/text',   'out', true, null),
  ('c1-light-claude-desktop-pro',          'query/answer', 'in',  true, null),
  ('c1-medium-claude-desktop-plus-code',   'query/text',   'out', true, null),
  ('c1-medium-claude-desktop-plus-code',   'query/answer', 'in',  true, null),
  ('c1-hard-claude-desktop-plus-workbench','query/text',   'out', true, null),
  ('c1-hard-claude-desktop-plus-workbench','query/answer', 'in',  true, null),

  -- LangChain : in=query/text, out=query/prompt+query/answer
  ('c2-light-langchain', 'query/text',   'in',  true,  null),
  ('c2-light-langchain', 'query/prompt', 'out', true,  null),
  ('c2-light-langchain', 'query/answer', 'out', true,  null),

  -- LiteLLM : in=query/prompt, out=query/answer
  ('c2-medium-litellm-cascade',         'query/prompt', 'in',  true, null),
  ('c2-medium-litellm-cascade',         'query/answer', 'out', true, null),
  ('c2-hard-litellm-plus-vllm-onprem',  'query/prompt', 'in',  true, null),
  ('c2-hard-litellm-plus-vllm-onprem',  'query/answer', 'out', true, null),

  -- Qdrant : in=embedding/dense, out=storage/vector + query/topk
  ('c3-light-qdrant-cloud-free',        'embedding/dense', 'in',  true,  null),
  ('c3-light-qdrant-cloud-free',        'storage/vector',  'out', true,  null),
  ('c3-light-qdrant-cloud-free',        'query/topk',      'out', true,  null),
  ('c3-medium-qdrant-self-host-hybrid', 'embedding/dense', 'in',  true,  null),
  ('c3-medium-qdrant-self-host-hybrid', 'embedding/sparse','in',  false, 'mode hybride dense/sparse'),
  ('c3-medium-qdrant-self-host-hybrid', 'storage/vector',  'out', true,  null),
  ('c3-medium-qdrant-self-host-hybrid', 'query/topk',      'out', true,  null),
  ('c3-hard-qdrant-onprem-airgapped',   'embedding/dense', 'in',  true,  null),
  ('c3-hard-qdrant-onprem-airgapped',   'storage/vector',  'out', true,  null),
  ('c3-hard-qdrant-onprem-airgapped',   'query/topk',      'out', true,  null),

  -- Embeddings : in=text/chunked, out=embedding/dense
  ('c4-light-mistral-embed-api',        'text/chunked',     'in',  true, null),
  ('c4-light-mistral-embed-api',        'embedding/dense',  'out', true, null),
  ('c4-medium-bge-m3-local',            'text/chunked',     'in',  true, null),
  ('c4-medium-bge-m3-local',            'embedding/dense',  'out', true, null),
  ('c4-hard-qwen3-embed-7b-local',      'text/chunked',     'in',  true, null),
  ('c4-hard-qwen3-embed-7b-local',      'embedding/dense',  'out', true, null),

  -- Supabase Postgres : out=storage/relational + storage/vector (pgvector)
  ('c5-light-postgres-pgvector-supabase', 'storage/relational', 'out', true, null),
  ('c5-light-postgres-pgvector-supabase', 'storage/vector',     'out', true, 'via pgvector'),

  -- Graphiti : in=text/chunked, out=relations/triple + storage/graph
  ('c5-medium-postgres-plus-graphiti', 'text/chunked',     'in',  true, null),
  ('c5-medium-postgres-plus-graphiti', 'relations/triple', 'out', true, null),
  ('c5-medium-postgres-plus-graphiti', 'storage/graph',    'out', true, null),

  -- XTDB : out=storage/graph + storage/relational (bitemporel)
  ('c5-hard-xtdb-plus-graphiti', 'storage/relational', 'out', true, null),
  ('c5-hard-xtdb-plus-graphiti', 'storage/graph',      'out', true, null),

  -- Packs C6 (bundles LLM+infra+backup) : in=query/prompt, out=query/answer
  ('c6-light-mistral-plus-scaleway-plus-b2',         'query/prompt', 'in',  true, null),
  ('c6-light-mistral-plus-scaleway-plus-b2',         'query/answer', 'out', true, null),
  ('c6-medium-mistral-plus-hetzner-plus-3-2-1',      'query/prompt', 'in',  true, null),
  ('c6-medium-mistral-plus-hetzner-plus-3-2-1',      'query/answer', 'out', true, null),
  ('c6-hard-vllm-onprem-plus-luks',                  'query/prompt', 'in',  true, null),
  ('c6-hard-vllm-onprem-plus-luks',                  'query/answer', 'out', true, null)
) as x(brick_slug, port_slug, direction, required, notes)
join public.components c on c.slug = x.brick_slug
join public.port_types p on p.slug = x.port_slug;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED — brick_infra_targets (compatibilité brique × infra)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.brick_infra_targets (brick_id, infra_target_id, recommended, notes)
select c.id, i.id, x.recommended, x.notes
from (values
  -- Frontmatter Xavier : compatible partout (c'est un fichier)
  ('c0-frontmatter-xavier-v1', 'on-prem-home',           true,  'Recommandé : vault local éditable.'),
  ('c0-frontmatter-xavier-v1', 'vps-hetzner-cx22',       false, null),
  ('c0-frontmatter-xavier-v1', 'saas-supabase-free',     false, 'Stockage relationnel à côté.'),

  -- Surfaces Claude : on-prem uniquement (apps macOS/Windows locales)
  ('c1-light-claude-desktop-pro',           'on-prem-home', true, null),
  ('c1-medium-claude-desktop-plus-code',    'on-prem-home', true, null),
  ('c1-hard-claude-desktop-plus-workbench', 'on-prem-home', true, null),

  -- LangChain : Python, tourne partout
  ('c2-light-langchain', 'vps-hetzner-cx22', true,  null),
  ('c2-light-langchain', 'vps-hetzner-cx31', true,  null),
  ('c2-light-langchain', 'on-prem-home',     true,  null),
  ('c2-light-langchain', 'bm-hetzner-ax42',  false, null),

  -- LiteLLM : Python self-host
  ('c2-medium-litellm-cascade', 'vps-hetzner-cx31', true,  null),
  ('c2-medium-litellm-cascade', 'on-prem-home',     true,  null),
  ('c2-medium-litellm-cascade', 'bm-hetzner-ax42',  false, null),
  ('c2-hard-litellm-plus-vllm-onprem', 'bm-hetzner-ax42', true,  'GPU recommandé pour vLLM.'),
  ('c2-hard-litellm-plus-vllm-onprem', 'gpu-runpod-a40',  true,  null),
  ('c2-hard-litellm-plus-vllm-onprem', 'on-prem-home',    false, 'Si machine GPU disponible.'),

  -- Qdrant Cloud : son propre SaaS
  ('c3-light-qdrant-cloud-free', 'saas-qdrant-cloud-free', true, null),
  -- Qdrant self-host : VPS, bare metal, on-prem
  ('c3-medium-qdrant-self-host-hybrid', 'vps-hetzner-cx31', true,  null),
  ('c3-medium-qdrant-self-host-hybrid', 'vps-hostinger-kvm2', false, null),
  ('c3-medium-qdrant-self-host-hybrid', 'bm-hetzner-ax42',  true,  null),
  ('c3-medium-qdrant-self-host-hybrid', 'on-prem-home',     true,  null),
  -- Qdrant air-gapped : on-prem + bare metal uniquement
  ('c3-hard-qdrant-onprem-airgapped', 'bm-hetzner-ax42', true, null),
  ('c3-hard-qdrant-onprem-airgapped', 'on-prem-home',    true, null),

  -- Embeddings
  ('c4-light-mistral-embed-api', 'saas-mistral-api', true, null),
  ('c4-medium-bge-m3-local',     'vps-hetzner-cx31', false, 'CPU lent : préférer GPU léger.'),
  ('c4-medium-bge-m3-local',     'on-prem-home',     true,  null),
  ('c4-medium-bge-m3-local',     'bm-hetzner-ax42',  true,  null),
  ('c4-hard-qwen3-embed-7b-local','gpu-runpod-a40',  true,  null),
  ('c4-hard-qwen3-embed-7b-local','on-prem-home',    false, 'Nécessite GPU ≥ 16 Go VRAM.'),

  -- Postgres : Supabase managé OU VPS self-host
  ('c5-light-postgres-pgvector-supabase', 'saas-supabase-free', true, null),
  ('c5-light-postgres-pgvector-supabase', 'vps-hetzner-cx22',   false, 'Postgres self-host.'),
  ('c5-light-postgres-pgvector-supabase', 'on-prem-home',       false, null),

  -- Graphiti : besoin de Neo4j ou Postgres+AGE
  ('c5-medium-postgres-plus-graphiti', 'vps-hetzner-cx31', true, null),
  ('c5-medium-postgres-plus-graphiti', 'bm-hetzner-ax42',  true, null),
  ('c5-medium-postgres-plus-graphiti', 'on-prem-home',     true, null),

  -- XTDB : on-prem ou bare metal
  ('c5-hard-xtdb-plus-graphiti', 'bm-hetzner-ax42', true, null),
  ('c5-hard-xtdb-plus-graphiti', 'on-prem-home',    true, null),

  -- Packs C6 LIGHT : Mistral + Scaleway + B2
  ('c6-light-mistral-plus-scaleway-plus-b2', 'saas-mistral-api',         true, 'API Mistral.'),
  ('c6-light-mistral-plus-scaleway-plus-b2', 'vps-scaleway-stardust1-s', true, 'Compute Scaleway FR.'),
  -- Pack MEDIUM
  ('c6-medium-mistral-plus-hetzner-plus-3-2-1', 'saas-mistral-api',  true, null),
  ('c6-medium-mistral-plus-hetzner-plus-3-2-1', 'saas-anthropic-api',true, 'Cascade T2 sur Claude.'),
  ('c6-medium-mistral-plus-hetzner-plus-3-2-1', 'vps-hetzner-cx31',  true, null),
  -- Pack HARD : on-prem GPU
  ('c6-hard-vllm-onprem-plus-luks', 'bm-hetzner-ax42', true, 'Dedicated avec GPU.'),
  ('c6-hard-vllm-onprem-plus-luks', 'on-prem-home',    true, 'Machine perso/cabinet.'),
  ('c6-hard-vllm-onprem-plus-luks', 'saas-anthropic-api', false, 'Escalade sources publiques uniquement.')
) as x(brick_slug, infra_slug, recommended, notes)
join public.components   c on c.slug = x.brick_slug
join public.infra_targets i on i.slug = x.infra_slug;
