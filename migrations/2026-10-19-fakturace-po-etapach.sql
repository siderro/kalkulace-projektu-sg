-- Migrace: fakturace po etapách, PM měsíčně, SLA jen jako podpora po spuštění
-- Spustit po migraci 2026-10-19-nabidka-texty.sql.
-- - výchozí PM 10 %
-- - výchozí SLA 0 Kč (SLA = volitelná podpora po spuštění, ne projektový poplatek)
-- - nové texty platebních podmínek a dalšího postupu (bez zálohové faktury)

alter table global_settings alter column default_pm_percent set default 10;
alter table global_settings alter column default_sla_monthly_fee set default 0;
alter table projects alter column pm_percent set default 10;
alter table projects alter column sla_monthly_fee set default 0;

-- Stávající projekty: staré „SLA během projektu“ už nemá význam, vynulovat.
-- PM procento u stávajících projektů neměníme (je to rozhodnutí per nabídka).
update projects set sla_monthly_fee = 0;

alter table global_settings alter column md_payment_terms set default 'Nic nefakturujeme předem. Fakturu za každou etapu vystavujeme až po jejím uzavření a vašem schválení. Řízení projektu fakturujeme průběžně po měsících, abyste měli náklady rozložené v čase. Splatnost faktur je 14 dní.';

alter table global_settings alter column md_next_steps set default '1. Potvrdíte nám nabídku (stačí e-mailem).
2. Domluvíme termín kick-off schůzky.
3. Na kick-offu si projdeme zadání, podklady a harmonogram.
4. Startujeme první etapou projektu.

Těšíme se na spolupráci.';

update global_settings set
  default_pm_percent = 10,
  default_sla_monthly_fee = 0,
  md_payment_terms = 'Nic nefakturujeme předem. Fakturu za každou etapu vystavujeme až po jejím uzavření a vašem schválení. Řízení projektu fakturujeme průběžně po měsících, abyste měli náklady rozložené v čase. Splatnost faktur je 14 dní.',
  md_next_steps = '1. Potvrdíte nám nabídku (stačí e-mailem).
2. Domluvíme termín kick-off schůzky.
3. Na kick-offu si projdeme zadání, podklady a harmonogram.
4. Startujeme první etapou projektu.

Těšíme se na spolupráci.';
