-- Ajoute volume_assumptions aux solutions pour permettre un calcul de prix
-- agrégé honnête (au lieu d'une valeur figée saisie à la main).
-- Clé = "<cost_unit>_per_month", valeur = nombre. Voir lib/pricing/volumeUnits.ts.

alter table public.solutions
  add column volume_assumptions jsonb not null default '{}'::jsonb;

comment on column public.solutions.volume_assumptions is
  'Hypothèses de volume pour le calcul de prix. Ex: {"image_per_month": 1000}. Voir lib/pricing/volumeUnits.ts.';

-- Seed des 4 solutions existantes
update public.solutions set volume_assumptions = '{"image_per_month": 1000}'::jsonb
  where slug = 'memo-image';

update public.solutions set volume_assumptions = '{"page_per_month": 500}'::jsonb
  where slug = 'memo-pdf';

update public.solutions set volume_assumptions = '{"minute_per_month": 240}'::jsonb
  where slug = 'memo-meeting';

update public.solutions set volume_assumptions = '{"requete_per_month": 1000}'::jsonb
  where slug = 'search-base';
