// ============================================================
// Default/seed data — matches docs/Calculation rules.md
// ============================================================

import type {
  GlobalSettings,
  ScreenComplexityCalibration,
  BillableProductDefinition,
} from '../types';

// --- Global settings defaults ---

export const DEFAULT_GLOBAL_SETTINGS: Omit<GlobalSettings, 'id'> = {
  default_hourly_rate: 1845,
  default_pm_percent: 8,
  default_sla_monthly_fee: 900,
  default_first_mobile_set: false,
  default_days_to_start: 14,
};

// --- Calibration defaults (base MD at complexity 5) ---

export const DEFAULT_CALIBRATION: Omit<ScreenComplexityCalibration, 'id'>[] = [
  {
    work_type_key: 'ux_primary_desktop',
    label: 'UX primární (Desktop)',
    base_md_at_level_5: 0.9,
    sort_order: 1,
  },
  {
    work_type_key: 'ux_secondary_mobile',
    label: 'UX sekundární (Mobil)',
    base_md_at_level_5: 0.4,
    sort_order: 2,
  },
  {
    work_type_key: 'ui_primary_desktop',
    label: 'UI primární (Desktop)',
    base_md_at_level_5: 1.1,
    sort_order: 3,
  },
  {
    work_type_key: 'ui_secondary_mobile',
    label: 'UI sekundární (Mobil)',
    base_md_at_level_5: 0.9,
    sort_order: 4,
  },
  {
    work_type_key: 'webflow',
    label: 'Webflow',
    base_md_at_level_5: 1.5,
    sort_order: 5,
  },
];

// --- Default billable product definitions ---

export const DEFAULT_PRODUCT_DEFINITIONS: Omit<BillableProductDefinition, 'id'>[] = [
  // Průzkum a pozice
  {
    section_key: 'pruzkum_a_pozice',
    label: 'Analytický workshop',
    description: '',
    calculation_type: 'manual',
    source_key: null,
    default_enabled: false,
    default_md: 2,
    default_price_mode: 'md_rate',
    override_allowed: true,
    sort_order: 10,
    active: true,
  },
  {
    section_key: 'pruzkum_a_pozice',
    label: 'Konkurenční analýza',
    description: '',
    calculation_type: 'manual',
    source_key: null,
    default_enabled: false,
    default_md: 1.5,
    default_price_mode: 'md_rate',
    override_allowed: true,
    sort_order: 20,
    active: true,
  },
  {
    section_key: 'pruzkum_a_pozice',
    label: 'Uživatelský výzkum',
    description: '',
    calculation_type: 'manual',
    source_key: null,
    default_enabled: false,
    default_md: 3,
    default_price_mode: 'md_rate',
    override_allowed: true,
    sort_order: 30,
    active: true,
  },

  // Koncept
  {
    section_key: 'koncept',
    label: 'UX primární (Desktop)',
    description: '',
    calculation_type: 'derived_from_screens',
    source_key: 'ux_primary_desktop',
    default_enabled: false,
    default_md: null,
    default_price_mode: 'md_rate',
    override_allowed: true,
    sort_order: 100,
    active: true,
  },
  {
    section_key: 'koncept',
    label: 'UX sekundární (Mobil)',
    description: '',
    calculation_type: 'derived_from_screens',
    source_key: 'ux_secondary_mobile',
    default_enabled: false,
    default_md: null,
    default_price_mode: 'md_rate',
    override_allowed: true,
    sort_order: 110,
    active: true,
  },

  // Vizuální design
  {
    section_key: 'vizualni_design',
    label: 'UI primární (Desktop)',
    description: '',
    calculation_type: 'derived_from_screens',
    source_key: 'ui_primary_desktop',
    default_enabled: false,
    default_md: null,
    default_price_mode: 'md_rate',
    override_allowed: true,
    sort_order: 200,
    active: true,
  },
  {
    section_key: 'vizualni_design',
    label: 'UI sekundární (Mobil)',
    description: '',
    calculation_type: 'derived_from_screens',
    source_key: 'ui_secondary_mobile',
    default_enabled: false,
    default_md: null,
    default_price_mode: 'md_rate',
    override_allowed: true,
    sort_order: 210,
    active: true,
  },

  // Programming
  {
    section_key: 'programming',
    label: 'Webflow',
    description: '',
    calculation_type: 'derived_from_screens',
    source_key: 'webflow',
    default_enabled: false,
    default_md: null,
    default_price_mode: 'md_rate',
    override_allowed: true,
    sort_order: 300,
    active: true,
  },
  {
    section_key: 'programming',
    label: 'Programování na míru',
    description: '',
    calculation_type: 'manual',
    source_key: null,
    default_enabled: false,
    default_md: 10,
    default_price_mode: 'md_rate',
    override_allowed: true,
    sort_order: 310,
    active: true,
  },
];
