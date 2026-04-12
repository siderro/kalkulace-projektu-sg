// ============================================================
// Data model types for the quotation generator
// Matches the schema described in /docs/Data model.md
// ============================================================

// --- Global Settings (single row) ---

export interface GlobalSettings {
  id: string;
  default_hourly_rate: number;
  default_pm_percent: number;
  default_sla_monthly_fee: number;
  default_first_mobile_set: boolean;
  default_days_to_start: number;
  md_supplier_info: string;
  md_contacts: string;
  md_references: string;
}

// --- Screen Complexity Calibration ---

export type WorkTypeKey =
  | 'ux_primary_desktop'
  | 'ux_secondary_mobile'
  | 'ui_primary_desktop'
  | 'ui_secondary_mobile'
  | 'webflow';

export interface ScreenComplexityCalibration {
  id: string;
  work_type_key: WorkTypeKey;
  label: string;
  base_md_at_level_5: number;
  sort_order: number;
}

// --- Billable Product Definitions (catalog) ---

export type CalculationType =
  | 'manual'
  | 'derived_from_screens';

export type SectionKey =
  | 'pruzkum_a_pozice'
  | 'koncept'
  | 'vizualni_design'
  | 'programming';

export type PriceMode = 'md_rate' | 'hourly_rate' | 'fixed';

export interface BillableProductDefinition {
  id: string;
  section_key: SectionKey;
  label: string;
  description: string;
  calculation_type: CalculationType;
  source_key: WorkTypeKey | null; // for derived items, which work type they map to
  default_enabled: boolean;
  default_md: number | null;
  default_price_mode: PriceMode;
  override_allowed: boolean;
  sort_order: number;
  active: boolean;
}

// --- Projects ---

export interface Project {
  id: string;
  name: string;
  project_code: string;
  version_label: string;
  project_date: string; // ISO date string
  hourly_rate: number;
  complexity_coefficient_percent: number;
  pm_percent: number;
  first_mobile_set: boolean;
  sla_monthly_fee: number;
  days_to_start: number;
  expected_start_date: string; // ISO date string, computed from days_to_start
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// --- Project Screens ---

export interface ProjectScreen {
  id: string;
  project_id: string;
  name: string;
  complexity: number; // 1-5
  note: string;
  ux_primary_desktop: boolean;
  ux_secondary_mobile: boolean;
  ui_primary_desktop: boolean;
  ui_secondary_mobile: boolean;
  webflow: boolean;
  sort_order: number;
}

// --- Project Billable Items ---

export type ValueSource =
  | 'manual_default'
  | 'derived_from_screens'
  | 'overridden_manual';

export interface ProjectBillableItem {
  id: string;
  project_id: string;
  product_definition_id: string;
  enabled: boolean;
  md_value: number;
  price_value: number;
  value_source: ValueSource;
  overridden: boolean;
  override_note: string;
  sort_order: number;
}

// --- Section labels for display ---

export const SECTION_LABELS: Record<SectionKey, string> = {
  pruzkum_a_pozice: 'Průzkum a pozice',
  koncept: 'Koncept',
  vizualni_design: 'Vizuální design',
  programming: 'Programming',
};

// --- Work type labels for display ---

export const WORK_TYPE_LABELS: Record<WorkTypeKey, string> = {
  ux_primary_desktop: 'UX primární (Desktop)',
  ux_secondary_mobile: 'UX sekundární (Mobil)',
  ui_primary_desktop: 'UI primární (Desktop)',
  ui_secondary_mobile: 'UI sekundární (Mobil)',
  webflow: 'Webflow',
};

// --- Complexity levels ---

export const COMPLEXITY_LEVELS = [1, 2, 3, 4, 5] as const;

export const COMPLEXITY_PERCENTAGES: Record<number, number> = {
  1: 0.20,
  2: 0.40,
  3: 0.60,
  4: 0.80,
  5: 1.00,
};
