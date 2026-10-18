-- Migrace: ruční datum začátku a konce projektu místo "dní do zahájení"
-- Spustit jednou v Supabase SQL editoru před nasazením nové verze aplikace.

alter table projects add column start_date date;
alter table projects add column end_date date;

-- Stávající projekty: začátek z původního předpokládaného zahájení, konec zůstane prázdný
update projects set start_date = expected_start_date;

alter table projects drop column days_to_start;
alter table projects drop column expected_start_date;

alter table global_settings drop column default_days_to_start;
