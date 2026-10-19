-- Migrace: reference a „Co nabídka nezahrnuje“ se edituje celé v košilce projektu
-- Spustit jednou v Supabase SQL editoru (po 2026-10-19-nabidka-kontakty-spolecnost.sql).
-- Dříve bylo projects.exclusions_extra jen doplnění ke globálnímu seznamu.
-- Teď je to celý seznam, proto u projektů s doplněním předřadit globální seznam,
-- aby z nabídky nic nezmizelo. Prázdné pole dál znamená „výchozí z nastavení“.

update projects
set exclusions_extra = (select md_exclusions from global_settings limit 1) || E'\n' || exclusions_extra
where trim(exclusions_extra) <> '';
