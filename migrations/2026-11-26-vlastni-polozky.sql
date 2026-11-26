-- Migrace: vlastní položka v každé sekci fakturovatelných položek
-- Spustit jednou v Supabase SQL editoru před nasazením nové verze aplikace.

-- true = položka s vlastním popisem zadaným v projektu
alter table billable_product_definitions add column if not exists custom boolean not null default false;

-- vlastní popis položky v projektu (prázdné = název z katalogu)
alter table project_billable_items add column if not exists custom_label text not null default '';

-- Jedna vlastní položka na konci každé sekce: 0,5 MD, ve výchozím stavu vypnutá
insert into billable_product_definitions (section_key, label, calculation_type, default_enabled, default_md, default_price_mode, sort_order, custom)
select s.section_key, 'Vlastní položka', 'manual', false, 0.5, 'md_rate',
  coalesce((select max(sort_order) from billable_product_definitions d where d.section_key = s.section_key), 0) + 1,
  true
from (values ('pruzkum_a_pozice'), ('koncept'), ('vizualni_design'), ('programming')) as s(section_key)
where not exists (
  select 1 from billable_product_definitions d where d.section_key = s.section_key and d.custom
);
