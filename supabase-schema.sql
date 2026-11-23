-- ============================================================
-- Supabase schema for Kalkulace projektu SG
-- Run this in Supabase SQL Editor to create all tables
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- 1. Global Settings (single row)
create table global_settings (
  id uuid primary key default uuid_generate_v4(),
  default_hourly_rate numeric not null default 1000,
  default_pm_percent numeric not null default 10,
  default_sla_monthly_fee numeric not null default 0,
  default_first_mobile_set boolean not null default false,
  pm_min_monthly_invoice numeric not null default 5000,
  -- Výchozí texty pro košilku nových projektů; ostatní texty nabídky jsou v offer_templates
  md_references text not null default '',
  md_exclusions text not null default ''
);

-- Insert default settings row
insert into global_settings (
  default_hourly_rate, default_pm_percent,
  default_sla_monthly_fee, default_first_mobile_set
) values (1000, 10, 0, false);

-- 2. Screen Complexity Calibration
create table screen_complexity_calibration (
  id uuid primary key default uuid_generate_v4(),
  work_type_key text not null unique,
  label text not null,
  base_md_at_level_5 numeric not null,
  sort_order integer not null default 0
);

-- Výchozí kalibrace je jen zástupná, skutečné hodnoty se nastavují v aplikaci
insert into screen_complexity_calibration (work_type_key, label, base_md_at_level_5, sort_order)
values
  ('ux_primary_desktop', 'UX primární (Desktop)', 1, 1),
  ('ux_secondary_mobile', 'UX sekundární (Mobil)', 1, 2),
  ('ui_primary_desktop', 'UI primární (Desktop)', 1, 3),
  ('ui_secondary_mobile', 'UI sekundární (Mobil)', 1, 4),
  ('webflow', 'Webflow', 1, 5);

-- 3. Billable Product Definitions (catalog)
create table billable_product_definitions (
  id uuid primary key default uuid_generate_v4(),
  section_key text not null,
  label text not null,
  description text not null default '',
  calculation_type text not null default 'manual',
  source_key text,
  default_enabled boolean not null default true,
  default_md numeric,
  default_price_mode text not null default 'md_rate',
  override_allowed boolean not null default true,
  sort_order integer not null default 0,
  active boolean not null default true
);

-- Výchozí katalog s zástupnou pracností, skutečné hodnoty se nastavují v aplikaci
insert into billable_product_definitions (section_key, label, calculation_type, source_key, default_enabled, default_md, default_price_mode, sort_order)
values
  ('pruzkum_a_pozice', 'Analytický workshop', 'manual', null, false, 1, 'md_rate', 10),
  ('pruzkum_a_pozice', 'Konkurenční analýza', 'manual', null, false, 1, 'md_rate', 20),
  ('pruzkum_a_pozice', 'Uživatelský výzkum', 'manual', null, false, 1, 'md_rate', 30),
  ('koncept', 'UX primární (Desktop)', 'derived_from_screens', 'ux_primary_desktop', false,null, 'md_rate', 100),
  ('koncept', 'UX sekundární (Mobil)', 'derived_from_screens', 'ux_secondary_mobile', false,null, 'md_rate', 110),
  ('vizualni_design', 'UI primární (Desktop)', 'derived_from_screens', 'ui_primary_desktop', false,null, 'md_rate', 200),
  ('vizualni_design', 'UI sekundární (Mobil)', 'derived_from_screens', 'ui_secondary_mobile', false,null, 'md_rate', 210),
  ('programming', 'Webflow', 'derived_from_screens', 'webflow', false,null, 'md_rate', 300),
  ('programming', 'Programování na míru', 'manual', null, false, 1, 'md_rate', 310);

-- 4. Projects
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null default '',
  project_code text not null default '',
  version_label text not null default 'v1',
  project_date date not null default current_date,
  hourly_rate numeric not null default 1000,
  complexity_coefficient_percent numeric not null default 100,
  pm_percent numeric not null default 10,
  first_mobile_set boolean not null default false,
  sla_monthly_fee numeric not null default 0,
  sla_months integer not null default 1,
  start_date date,
  end_date date,
  goal text not null default '',
  client_name text not null default '',
  client_contact text not null default '',
  exclusions_extra text not null default '',
  references_override text not null default '',
  notes text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Project Screens
create table project_screens (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null default '',
  complexity integer not null default 3 check (complexity between 1 and 5),
  note text not null default '',
  ux_primary_desktop boolean not null default true,
  ux_secondary_mobile boolean not null default false,
  ui_primary_desktop boolean not null default true,
  ui_secondary_mobile boolean not null default false,
  webflow boolean not null default true,
  sort_order integer not null default 0
);

-- 6. Project Billable Items
create table project_billable_items (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  product_definition_id uuid not null references billable_product_definitions(id),
  enabled boolean not null default true,
  md_value numeric not null default 0,
  price_value numeric not null default 0,
  value_source text not null default 'manual_default',
  overridden boolean not null default false,
  override_note text not null default '',
  sort_order integer not null default 0
);

-- Row Level Security (RLS)
alter table global_settings enable row level security;
alter table screen_complexity_calibration enable row level security;
alter table billable_product_definitions enable row level security;
alter table projects enable row level security;
alter table project_screens enable row level security;
alter table project_billable_items enable row level security;

-- 7. Šablona nabídky (nahrává ji `npm run sablona` se service role klíčem, aplikace ji jen čte)
create table offer_templates (
  key text primary key,
  content text not null default '',
  updated_at timestamptz not null default now()
);
alter table offer_templates enable row level security;

-- Přístup jen pro přihlášené s e-mailem @svejda-goldmann.cz
create policy "sg_access" on global_settings for all using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
create policy "sg_access" on screen_complexity_calibration for all using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
create policy "sg_access" on billable_product_definitions for all using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
create policy "sg_access" on projects for all using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
create policy "sg_access" on project_screens for all using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
create policy "sg_access" on project_billable_items for all using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
create policy "sg_access" on offer_templates for select using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
