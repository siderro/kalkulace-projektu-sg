-- Migrace: šablona nabídky mimo repozitář + přístup jen pro ŠG
-- - tabulka offer_templates: šablona nabídky (Markdown), nahrává ji `npm run sablona`
-- - RLS: data vidí jen přihlášení s e-mailem @svejda-goldmann.cz (dřív kdokoli přihlášený)
-- Spustit jednou v Supabase SQL editoru.

create table if not exists offer_templates (
  key text primary key,
  content text not null default '',
  updated_at timestamptz not null default now()
);

alter table offer_templates enable row level security;

drop policy if exists "authenticated_access" on global_settings;
drop policy if exists "authenticated_access" on screen_complexity_calibration;
drop policy if exists "authenticated_access" on billable_product_definitions;
drop policy if exists "authenticated_access" on projects;
drop policy if exists "authenticated_access" on project_screens;
drop policy if exists "authenticated_access" on project_billable_items;
drop policy if exists "sg_access" on global_settings;
drop policy if exists "sg_access" on screen_complexity_calibration;
drop policy if exists "sg_access" on billable_product_definitions;
drop policy if exists "sg_access" on projects;
drop policy if exists "sg_access" on project_screens;
drop policy if exists "sg_access" on project_billable_items;
drop policy if exists "sg_access" on offer_templates;

create policy "sg_access" on global_settings for all using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
create policy "sg_access" on screen_complexity_calibration for all using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
create policy "sg_access" on billable_product_definitions for all using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
create policy "sg_access" on projects for all using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
create policy "sg_access" on project_screens for all using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
create policy "sg_access" on project_billable_items for all using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
-- Šablonu aplikace jen čte, zapisuje ji skript se service role klíčem (ten RLS obchází)
create policy "sg_access" on offer_templates for select using (lower(coalesce(auth.jwt() ->> 'email', '')) like '%@svejda-goldmann.cz');
