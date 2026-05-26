// Types de la base Mnémo. Tenus à la main, alignés sur les migrations :
//   - 20260525010854_init_rails.sql         (rails F9 : circles, memberships, …)
//   - 20260525234316_catalogue_components   (catalogue : vendors, components, …)
//   - 20260526013844_taxonomy_refactor      (refonte : brick_categories, ports,
//                                            infra_targets, hardware_recipes, …)
//   - 20260526021849_solutions_framework    (solutions, solution_steps,
//                                            brick_quality_ratings)
// `circle_id` est le pivot multi-tenant (RLS).

export type CircleRole = "owner" | "admin" | "member";
export type ConsentScope = "cost_network";
export type Currency = "EUR" | "USD";
export type CostPeriod = "monthly" | "usage" | "one_off";

export type SovereigntyZone = "eu" | "us" | "maroc" | "other";
export type PricingModel = "free" | "flat" | "usage" | "self_host" | "contact";
export type ConfidenceLevel = "low" | "medium" | "high";
export type ComponentStatus = "draft" | "validated" | "deprecated";
export type PresetFit = "light" | "medium" | "hard";

export type BrickRank = "preingest" | "ingest" | "storage" | "query" | "ai" | "surface" | "ops";
export type PortDirection = "in" | "out";
export type InfraKind =
  | "vps_managed"
  | "bare_metal"
  | "gpu_rented"
  | "on_prem"
  | "saas_managed";

export type CircleRow = { id: string; name: string; owner_id: string; created_at: string };
export type MembershipRow = {
  id: string;
  circle_id: string;
  user_id: string;
  role: CircleRole;
  created_at: string;
};
export type NetworkConsentRow = {
  id: string;
  circle_id: string;
  user_id: string;
  scope: ConsentScope;
  consented: boolean;
  consented_at: string | null;
  revoked_at: string | null;
  created_at: string;
};
export type ConfigurationRow = {
  id: string;
  circle_id: string;
  created_by: string | null;
  label: string | null;
  profile: unknown;
  recommendation: unknown;
  created_at: string;
};
export type CostObservationRow = {
  id: string;
  circle_id: string;
  layer_id: number;
  vendor: string;
  amount: number;
  currency: Currency;
  period: CostPeriod;
  observed_at: string;
  source_url: string | null;
  created_by: string | null;
};

export type VendorRow = {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  sovereignty_zone: SovereigntyZone;
  website: string | null;
  contact_email: string | null;
  contact_form_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ComponentRow = {
  id: string;
  vendor_id: string;
  layer_id: number;
  category_id: string | null;
  slug: string;
  name: string;
  tier: string | null;
  description: string | null;
  pricing_model: PricingModel;
  base_price_eur: number;
  unit: string;
  pricing_url: string | null;
  preset_fit: PresetFit[];
  capabilities: Record<string, unknown>;
  source_url: string | null;
  last_checked_at: string | null;
  confidence: ConfidenceLevel;
  status: ComponentStatus;
  notes: string | null;
  rfq_template: string | null;
  created_at: string;
  updated_at: string;
};

export type BrickCategoryRow = {
  id: string;
  slug: string;
  name: string;
  rank: BrickRank;
  position: number;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type PortTypeRow = {
  id: string;
  slug: string;
  name: string;
  family: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type InfraTargetRow = {
  id: string;
  slug: string;
  name: string;
  infra_kind: InfraKind;
  vendor_id: string | null;
  country: string | null;
  sovereignty_zone: SovereigntyZone;
  base_price_eur: number;
  unit: string;
  specs: Record<string, unknown>;
  source_url: string | null;
  last_checked_at: string | null;
  confidence: ConfidenceLevel;
  status: ComponentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type HardwareBomItem = {
  part: string;
  model: string;
  price_eur: number;
  vendor?: string;
  url?: string;
  ram_gb?: number;
  disk_gb?: number;
};

export type HardwareRecipeRow = {
  id: string;
  slug: string;
  name: string;
  use_case: string;
  description: string | null;
  bom: HardwareBomItem[];
  total_price_eur: number;
  purchase_url: string | null;
  installer_notes: string | null;
  status: ComponentStatus;
  created_at: string;
  updated_at: string;
};

export type BrickPortRow = {
  brick_id: string;
  port_type_id: string;
  direction: PortDirection;
  required: boolean;
  notes: string | null;
};

export type BrickInfraTargetRow = {
  brick_id: string;
  infra_target_id: string;
  recommended: boolean;
  notes: string | null;
};

export type SolutionComplexity = "easy" | "medium" | "hard";
export type RatingSource = "internal" | "user_report" | "vendor_doc";

export type SolutionRow = {
  id: string;
  slug: string;
  title: string;
  problem_statement: string;
  audience: string | null;
  complexity: SolutionComplexity;
  total_price_estimate_eur: number | null;
  volume_assumptions: Record<string, number>;
  estimated_setup_minutes: number | null;
  status: ComponentStatus;
  hero_emoji: string | null;
  hero_color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type SolutionStepRow = {
  id: string;
  solution_id: string;
  position: number;
  title: string;
  description: string | null;
  required_category_id: string | null;
  recommended_brick_id: string | null;
  alternative_brick_ids: string[];
  input_port_id: string | null;
  output_port_id: string | null;
  decision_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BrickQualityRatingRow = {
  id: string;
  brick_id: string;
  use_case: string;
  score: number;
  cost_per_op_eur: number | null;
  cost_unit: string | null;
  notes: string | null;
  source: RatingSource;
  rated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PriceHistoryRow = {
  id: string;
  component_id: string;
  price_eur: number;
  unit: string;
  pricing_model: PricingModel;
  source_url: string | null;
  checked_at: string;
  note: string | null;
};

export type NetworkConsentInsert = {
  circle_id: string;
  user_id: string;
  scope: ConsentScope;
  consented: boolean;
  consented_at: string | null;
  revoked_at: string | null;
};

type TableShape<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      circles: TableShape<CircleRow, Omit<CircleRow, "id" | "created_at">>;
      memberships: TableShape<MembershipRow, Omit<MembershipRow, "id" | "created_at">>;
      network_consents: TableShape<NetworkConsentRow, NetworkConsentInsert>;
      configurations: TableShape<ConfigurationRow, Omit<ConfigurationRow, "id" | "created_at">>;
      cost_observations: TableShape<CostObservationRow, Omit<CostObservationRow, "id" | "observed_at">>;
      vendors: TableShape<VendorRow, Omit<VendorRow, "id" | "created_at" | "updated_at">>;
      components: TableShape<ComponentRow, Omit<ComponentRow, "id" | "created_at" | "updated_at">>;
      price_history: TableShape<PriceHistoryRow, Omit<PriceHistoryRow, "id" | "checked_at">>;
      brick_categories: TableShape<
        BrickCategoryRow,
        Omit<BrickCategoryRow, "id" | "created_at" | "updated_at">
      >;
      port_types: TableShape<
        PortTypeRow,
        Omit<PortTypeRow, "id" | "created_at" | "updated_at">
      >;
      infra_targets: TableShape<
        InfraTargetRow,
        Omit<InfraTargetRow, "id" | "created_at" | "updated_at">
      >;
      hardware_recipes: TableShape<
        HardwareRecipeRow,
        Omit<HardwareRecipeRow, "id" | "created_at" | "updated_at">
      >;
      brick_ports: TableShape<BrickPortRow, BrickPortRow>;
      brick_infra_targets: TableShape<BrickInfraTargetRow, BrickInfraTargetRow>;
      solutions: TableShape<SolutionRow, Omit<SolutionRow, "id" | "created_at" | "updated_at">>;
      solution_steps: TableShape<
        SolutionStepRow,
        Omit<SolutionStepRow, "id" | "created_at" | "updated_at">
      >;
      brick_quality_ratings: TableShape<
        BrickQualityRatingRow,
        Omit<BrickQualityRatingRow, "id" | "created_at" | "updated_at">
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
