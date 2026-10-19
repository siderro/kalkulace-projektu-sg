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
  default_pm_percent: 10,
  default_sla_monthly_fee: 0,
  default_first_mobile_set: false,
  pm_min_monthly_invoice: 5000,
  md_supplier_info: `Švejda Goldmann, s.r.o.
Pernerova 293/11
186 00 Praha 8
IČ 04888189
DIČ CZ04888189R
u MS v Praze, C 254389
DS hb6svz2
Číslo účtu: 2700976062 / 2010 (Fio)`,
  md_contacts: `**Termíny a průběh projektu**
Lydia Tomajková, Project lead 776 376 585
lydia.tomajkova@svejda-goldmann.cz

**Design**
David Švejda, Design lead 602 384 820
david@svejda-goldmann.cz

**Strategie a rozpočet**
Jakub Goldmann, CEO 777 907 719
jakub@svejda-goldmann.cz`,
  md_references: ``,
  md_exclusions: `- Copywriting a tvorba textů
- Fotografie, ilustrace a videa
- Hosting, domény a licence (fonty, pluginy)
- Plnění obsahu do redakčního systému
- Překlady do dalších jazyků`,
  md_support_text: `Zahrnuje reakci na vaše požadavky do 2 pracovních dnů, pravidelné aktualizace a drobné úpravy obsahu v rozsahu do 2 hodin měsíčně.`,
  md_payment_terms: `Nic nefakturujeme předem. Fakturu za každou etapu vystavujeme až po jejím uzavření a vašem schválení. Splatnost faktur je 14 dní.`,
  md_pm_text: `Po celou dobu projektu máte jednoho kontaktního člověka – Lydii Tomajkovou. Každý týden dostanete krátký status, hlídáme termíny, rozpočet i rozsah a koordinujeme celý tým tak, abyste se nemuseli starat o nic jiného než o zpětnou vazbu.`,
  md_next_steps: `1. Potvrdíte nám nabídku (stačí e-mailem).
2. Domluvíme termín kick-off schůzky.
3. Na kick-offu si projdeme zadání, podklady a harmonogram.
4. Startujeme první etapou projektu.

Těšíme se na spolupráci.`,
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
