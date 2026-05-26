-- ============================================================================
-- Catalogue de composants éditable
-- ============================================================================
-- Sort la stack 7 couches (LIGHT/MEDIUM/HARD) du code vers une vraie BDD
-- éditable via /admin. Tables : vendors, components, price_history.
--
-- Écritures réservées au service role (clé secrète serveur). La RLS bloque
-- toute écriture pour les rôles authenticated/anon ; les server actions admin
-- utiliseront le client service role après contrôle isAdmin() côté app.
-- Lecture publique sur components 'validated' (catalogue ouvert).
--
-- Source du seed : lib/engine/layers.ts + lib/pricing/sources.ts (2026-05-23).
-- Toutes les tables ont RLS activée (règle absolue AGENTS.md §4).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Types énumérés (unions strictes)
-- ─────────────────────────────────────────────────────────────────────────────

create type public.sovereignty_zone as enum ('eu', 'us', 'maroc', 'other');
create type public.pricing_model    as enum ('free', 'flat', 'usage', 'self_host', 'contact');
create type public.confidence_level as enum ('low', 'medium', 'high');
create type public.component_status as enum ('draft', 'validated', 'deprecated');

-- ─────────────────────────────────────────────────────────────────────────────
-- Table : vendors
-- ─────────────────────────────────────────────────────────────────────────────

create table public.vendors (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  country           text,
  sovereignty_zone  public.sovereignty_zone not null default 'other',
  website           text,
  contact_email     text,
  contact_form_url  text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table : components (un produit/tier rattaché à un vendor et une couche)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.components (
  id              uuid primary key default gen_random_uuid(),
  vendor_id       uuid not null references public.vendors (id) on delete restrict,
  layer_id        smallint not null check (layer_id between 0 and 6),
  slug            text not null unique,
  name            text not null,
  tier            text,
  description     text,
  pricing_model   public.pricing_model not null default 'flat',
  base_price_eur  numeric(12, 4) not null default 0,
  unit            text not null default 'mois',
  pricing_url     text,
  preset_fit      text[] not null default '{}',
  capabilities    jsonb  not null default '{}'::jsonb,
  source_url      text,
  last_checked_at date,
  confidence      public.confidence_level not null default 'medium',
  status          public.component_status not null default 'draft',
  notes           text,
  rfq_template    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index components_layer_idx        on public.components (layer_id);
create index components_vendor_idx       on public.components (vendor_id);
create index components_status_idx       on public.components (status);
create index components_preset_fit_idx   on public.components using gin (preset_fit);
create index components_capabilities_idx on public.components using gin (capabilities);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table : price_history (snapshot audit ±30 %)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.price_history (
  id            uuid primary key default gen_random_uuid(),
  component_id  uuid not null references public.components (id) on delete cascade,
  price_eur     numeric(12, 4) not null,
  unit          text not null,
  pricing_model public.pricing_model not null,
  source_url    text,
  checked_at    timestamptz not null default now(),
  note          text
);

create index price_history_component_idx on public.price_history (component_id, checked_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger : snapshot price_history à chaque changement de prix
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.snapshot_component_price()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.price_history (component_id, price_eur, unit, pricing_model, source_url, note)
    values (new.id, new.base_price_eur, new.unit, new.pricing_model, new.source_url, 'création composant');
  elsif (tg_op = 'UPDATE') then
    if (new.base_price_eur is distinct from old.base_price_eur)
       or (new.pricing_model is distinct from old.pricing_model)
       or (new.unit is distinct from old.unit) then
      insert into public.price_history (component_id, price_eur, unit, pricing_model, source_url, note)
      values (new.id, new.base_price_eur, new.unit, new.pricing_model, new.source_url, 'mise à jour prix');
    end if;
  end if;
  return new;
end;
$$;

create trigger components_price_snapshot
  after insert or update on public.components
  for each row execute function public.snapshot_component_price();

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger : updated_at automatique sur vendors + components
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger vendors_touch_updated_at
  before update on public.vendors
  for each row execute function public.touch_updated_at();

create trigger components_touch_updated_at
  before update on public.components
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS : activée sur les 3 tables (règle absolue)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.vendors       enable row level security;
alter table public.components    enable row level security;
alter table public.price_history enable row level security;

-- vendors : lecture publique (catalogue ouvert) ; pas de policy write → service role uniquement
create policy vendors_select_public on public.vendors
  for select to anon, authenticated using (true);

-- components : lecture publique sur 'validated' uniquement ; drafts/deprecated cachés au public
create policy components_select_validated on public.components
  for select to anon, authenticated using (status = 'validated');

-- price_history : lecture publique (transparence audit) sur composants validés
create policy price_history_select_public on public.price_history
  for select to anon, authenticated using (
    exists (select 1 from public.components c where c.id = component_id and c.status = 'validated')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed : 12 vendors + 21 composants extraits de lib/engine/layers.ts (2026-05-23)
-- Convention slug : c{layer}-{preset}-{produit}
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.vendors (slug, name, country, sovereignty_zone, website, contact_email, notes) values
  ('communaute-mnemo', 'Communauté Mnémo',    'FR', 'eu',    'https://github.com/erwanjegou/mnemo', null,
   'Frontmatter Xavier v1.0.0, conventions de la cohorte workshop-01.'),
  ('anthropic',        'Anthropic',           'US', 'us',    'https://www.anthropic.com',           'sales@anthropic.com',
   'Claude (Desktop, Code, Workbench, API).'),
  ('berriai',          'BerriAI (LiteLLM)',   'US', 'us',    'https://www.litellm.ai',              null,
   'LiteLLM gateway, open-source self-host.'),
  ('langchain',        'LangChain',           'US', 'us',    'https://www.langchain.com',           null,
   'Framework Python d''orchestration LLM, open-source.'),
  ('qdrant',           'Qdrant',              'DE', 'eu',    'https://qdrant.tech',                 'sales@qdrant.tech',
   'Vector DB Rust, Cloud (DE) ou self-host.'),
  ('mistral-ai',       'Mistral AI',          'FR', 'eu',    'https://mistral.ai',                  'contact@mistral.ai',
   'La Plateforme : LLM + embeddings API souveraine UE.'),
  ('baai',             'BAAI (BGE)',          'CN', 'other', 'https://huggingface.co/BAAI',         null,
   'Beijing Academy of AI — modèles BGE (embeddings, reranker), open weights.'),
  ('alibaba-qwen',     'Alibaba Qwen',        'CN', 'other', 'https://huggingface.co/Qwen',         null,
   'Modèles Qwen (embeddings, LLM), open weights.'),
  ('supabase',         'Supabase',            'SG', 'other', 'https://supabase.com',                'sales@supabase.com',
   'Postgres managé + pgvector + auth.'),
  ('zep-ai',           'Zep AI (Graphiti)',   'US', 'us',    'https://www.getzep.com',              'hello@getzep.com',
   'Graphiti : graphe temporel pour mémoire IA.'),
  ('juxt',             'JUXT (XTDB)',         'GB', 'other', 'https://xtdb.com',                    'hello@xtdb.com',
   'XTDB : base bitemporelle native.'),
  ('hetzner',          'Hetzner',             'DE', 'eu',    'https://www.hetzner.com',             'info@hetzner.com',
   'Serveurs dédiés et cloud, Allemagne / Finlande.'),
  ('scaleway',         'Scaleway',            'FR', 'eu',    'https://www.scaleway.com',            'sales@scaleway.com',
   'Cloud souverain français (Iliad).'),
  ('backblaze',        'Backblaze',           'US', 'us',    'https://www.backblaze.com',           'sales@backblaze.com',
   'Backup objet B2 (compatible S3).');

-- ─────────────────────────────────────────────────────────────────────────────
-- Composants (21 : 7 couches × 3 presets)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.components (
  vendor_id, layer_id, slug, name, tier, description,
  pricing_model, base_price_eur, unit, pricing_url,
  preset_fit, capabilities, source_url, last_checked_at, confidence, status, notes
)
select v.id, x.layer_id, x.slug, x.name, x.tier, x.description,
       x.pricing_model::public.pricing_model, x.base_price_eur, x.unit, x.pricing_url,
       x.preset_fit, x.capabilities::jsonb, x.source_url, x.last_checked_at::date,
       x.confidence::public.confidence_level, 'validated'::public.component_status, x.notes
from (values
  -- ── C0 : Contrat commun (frontmatter YAML) — identique sur les 3 presets ──
  ('communaute-mnemo', 0, 'c0-frontmatter-xavier-v1', 'Frontmatter universel Xavier v1.0.0', 'v1.0.0',
   'JSON Schema, triple validation, champ circle pivot RLS.',
   'free', 0, 'gratuit', null,
   array['light','medium','hard'],
   '{"open_source":true,"sovereignty_eu":true}',
   null, '2026-05-23', 'high',
   'Contrat de données partagé par toute la cohorte Mnémo. Alternative déconseillée : schéma custom.'),

  -- ── C1 : Surface utilisateur (MCP) ──
  ('anthropic', 1, 'c1-light-claude-desktop-pro', 'Claude Desktop Pro', 'Pro',
   'Surface MCP unique, abonnement individuel.',
   'flat', 20, 'mois', 'https://platform.claude.com/docs/en/about-claude/pricing',
   array['light'], '{"mcp":true}',
   'https://platform.claude.com/docs/en/about-claude/pricing', '2026-05-23', 'high',
   null),
  ('anthropic', 1, 'c1-medium-claude-desktop-plus-code', 'Claude Desktop + Claude Code', 'Pro + Code',
   'Surface MCP + outil dev intégré.',
   'flat', 40, 'mois', 'https://platform.claude.com/docs/en/about-claude/pricing',
   array['medium'], '{"mcp":true}',
   'https://platform.claude.com/docs/en/about-claude/pricing', '2026-05-23', 'high',
   null),
  ('anthropic', 1, 'c1-hard-claude-desktop-plus-workbench', 'Claude Desktop + Anthropic Workbench', 'Team / Workbench',
   'Surface MCP + console audit/évaluation pour cabinets régulés.',
   'flat', 100, 'mois', 'https://platform.claude.com/docs/en/about-claude/pricing',
   array['hard'], '{"mcp":true,"audit_console":true}',
   'https://platform.claude.com/docs/en/about-claude/pricing', '2026-05-23', 'high',
   null),

  -- ── C2 : Orchestrateur RAG (+ cascade LLM) ──
  ('langchain', 2, 'c2-light-langchain', 'LangChain (Python)', 'OSS',
   'Framework orchestration RAG sans cascade. LLM API direct.',
   'self_host', 0, 'mois', 'https://www.langchain.com/pricing',
   array['light'], '{"open_source":true}',
   null, '2026-05-23', 'high',
   'Alternatives : LlamaIndex, Haystack, DSPy.'),
  ('berriai', 2, 'c2-medium-litellm-cascade', 'LiteLLM self-host + cascade T1→T2', 'OSS self-host',
   'Cascade T1 (Mistral Small) → T2 (Claude Sonnet) sur escalade.',
   'self_host', 0, 'mois', 'https://www.litellm.ai/#pricing',
   array['medium'], '{"open_source":true,"cascade":true}',
   null, '2026-05-23', 'high',
   'Alternatives : OpenRouter, Portkey.'),
  ('berriai', 2, 'c2-hard-litellm-plus-vllm-onprem', 'LiteLLM + vLLM on-prem', 'OSS on-prem',
   'T1 = Qwen3-4B local, T2 = Qwen3-30B local. Stack air-gappable.',
   'self_host', 0, 'mois', 'https://www.litellm.ai/#pricing',
   array['hard'], '{"open_source":true,"on_prem":true,"cascade":true}',
   null, '2026-05-23', 'high',
   'Alternatives : SGLang, TGI.'),

  -- ── C3 : Retrieval + reranking ──
  ('qdrant', 3, 'c3-light-qdrant-cloud-free', 'Qdrant Cloud (free tier)', 'Free',
   'Vector DB managée, dense uniquement, sans reranker.',
   'free', 0, 'mois', 'https://qdrant.tech/pricing/',
   array['light'], '{"managed":true}',
   'https://qdrant.tech/pricing/', '2026-05-23', 'high',
   'Alternatives : Pinecone, Weaviate Cloud, pgvector simple.'),
  ('qdrant', 3, 'c3-medium-qdrant-self-host-hybrid', 'Qdrant self-host + hybride dense/sparse + BGE-Reranker-v2', 'OSS',
   'Score composite cosine × cognitive_weight × freshness.',
   'self_host', 0, 'mois', 'https://qdrant.tech/pricing/',
   array['medium'], '{"open_source":true,"hybrid_search":true,"reranker":true}',
   'https://qdrant.tech/pricing/', '2026-05-23', 'high',
   'Alternatives : Vespa, Marqo.'),
  ('qdrant', 3, 'c3-hard-qdrant-onprem-airgapped', 'Qdrant on-prem air-gapped + BGE-Reranker v2.5', 'OSS on-prem',
   'Isolé du net, audit trail sur chaque query.',
   'self_host', 0, 'mois', 'https://qdrant.tech/pricing/',
   array['hard'], '{"open_source":true,"on_prem":true,"air_gapped":true,"audit_trail":true}',
   'https://qdrant.tech/pricing/', '2026-05-23', 'high',
   'Alternatives : ElasticSearch + RankZephyr.'),

  -- ── C4 : Embeddings ──
  ('mistral-ai', 4, 'c4-light-mistral-embed-api', 'Mistral embed API', 'API',
   'Embeddings managés, simple. Souveraineté UE/FR.',
   'usage', 10, 'mois', 'https://mistral.ai/pricing',
   array['light'], '{"managed":true,"sovereignty_eu":true}',
   'https://mistral.ai/pricing', '2026-05-23', 'medium',
   'Alternatives : OpenAI text-embedding-3, Cohere. Variante multimodale : Voyage-Multimodal-3.'),
  ('baai', 4, 'c4-medium-bge-m3-local', 'BGE-M3 (local via Ollama)', 'OSS local',
   'Self-host, contrôle total, GPU léger suffit.',
   'self_host', 20, 'mois', 'https://huggingface.co/BAAI/bge-m3',
   array['medium'], '{"open_source":true,"on_prem":true}',
   null, '2026-05-23', 'medium',
   'Alternatives : NV-Embed-v2, Stella. Variante multimodale : LCO-Embedding-Omni-7B.'),
  ('alibaba-qwen', 4, 'c4-hard-qwen3-embed-7b-local', 'Qwen3-Embed-7B (local)', 'OSS GPU',
   'GPU H100/A100 loué ou on-prem.',
   'self_host', 100, 'mois', 'https://huggingface.co/Qwen',
   array['hard'], '{"open_source":true,"on_prem":true,"gpu_required":true}',
   null, '2026-05-23', 'medium',
   'Alternatives : InternLM-Embed, GTE. Multimodal : Qwen3-Embed + Whisper large-v3 (audio).'),

  -- ── C5 : Stockage polyglotte (± bitemporel) ──
  ('supabase', 5, 'c5-light-postgres-pgvector-supabase', 'Postgres 16 + pgvector (Supabase free tier)', 'Free',
   'Vault markdown source de vérité (Amine) recommandé.',
   'free', 0, 'mois', 'https://supabase.com/pricing',
   array['light'], '{"managed":true,"open_source":true}',
   'https://supabase.com/pricing', '2026-05-23', 'medium',
   'Alternatives : SQLite + Chroma (déconseillé en production).'),
  ('zep-ai', 5, 'c5-medium-postgres-plus-graphiti', 'Postgres + pgvector + Graphiti', 'Cloud / OSS',
   'Vault markdown + projections rejouables. Option Meydeey.',
   'flat', 15, 'mois', 'https://supabase.com/pricing',
   array['medium'], '{"open_source":true,"graph":true,"temporal":true}',
   null, '2026-05-23', 'medium',
   'Alternatives : XTDB hybride (option Chris), DuckDB+VSS. Si bitemporel obligatoire : Postgres + Apache AGE (ADR-011).'),
  ('juxt', 5, 'c5-hard-xtdb-plus-graphiti', 'XTDB + Graphiti hybride', 'OSS on-prem',
   'Fact-store bitemporel natif, audit signé PL/pgSQL.',
   'self_host', 40, 'mois', 'https://xtdb.com/pricing',
   array['hard'], '{"open_source":true,"on_prem":true,"bitemporal":true,"audit_signed":true}',
   null, '2026-05-23', 'medium',
   'Alternatives : Datomic Pro, TerminusDB. Option C (Chris) ou Postgres+AGE on-prem.'),

  -- ── C6 : Infra (LLM Gateway + inference + backup) ──
  ('mistral-ai', 6, 'c6-light-mistral-plus-scaleway-plus-b2', 'Mistral La Plateforme + Scaleway VPS + Backblaze B2', 'Pack LIGHT',
   'Tout managé, démarrage en 2h. Scaleway FR ~10€, Mistral usage, Restic vers B2.',
   'flat', 30, 'mois', 'https://mistral.ai/pricing',
   array['light'], '{"managed":true,"sovereignty_eu":true}',
   'https://www.scaleway.com/en/pricing/virtual-instances-pricing/', '2026-05-23', 'high',
   'Vendors associés : Scaleway (compute FR), Backblaze (backup). Alternatives : OpenAI API + OVH Public Cloud.'),
  ('hetzner', 6, 'c6-medium-mistral-plus-hetzner-plus-3-2-1', 'Mistral + escalade Claude Sonnet via LiteLLM + Hetzner CX31 + Backup 3-2-1', 'Pack MEDIUM',
   'Souveraineté UE/FR, cascade T1/T2 économise ~70 % LLM.',
   'flat', 100, 'mois', 'https://www.hetzner.com/cloud',
   array['medium'], '{"sovereignty_eu":true,"cascade":true,"backup_3_2_1":true}',
   'https://www.scaleway.com/en/pricing/virtual-instances-pricing/', '2026-05-23', 'high',
   'Vendors associés : Mistral (LLM), Anthropic (escalade), Backblaze + Scaleway (backup 3-2-1). Alternatives : OVHcloud + Scaleway IA.'),
  ('hetzner', 6, 'c6-hard-vllm-onprem-plus-luks', 'vLLM on-prem (Qwen3-30B) + Hetzner dedicated + LUKS/Tang/Clevis', 'Pack HARD',
   'Souveraineté N4 + backup multi-continental P4 (Meydeey). Escalade Sonnet sources publiques uniquement.',
   'flat', 400, 'mois', 'https://www.hetzner.com/dedicated-rootserver',
   array['hard'], '{"on_prem":true,"air_gapped":true,"sovereignty_eu":true,"encryption_luks":true}',
   'https://www.scaleway.com/en/pricing/virtual-instances-pricing/', '2026-05-23', 'high',
   'Vendors associés : Communauté (vLLM), Anthropic (escalade sources publiques). Alternatives : OVHcloud Bare Metal + GPU AMD MI300.')
) as x(
  vendor_slug, layer_id, slug, name, tier, description,
  pricing_model, base_price_eur, unit, pricing_url,
  preset_fit, capabilities, source_url, last_checked_at, confidence, notes
)
join public.vendors v on v.slug = x.vendor_slug;
