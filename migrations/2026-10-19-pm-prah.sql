-- Migrace: práh pro měsíční fakturaci řízení projektu
-- Spustit po migraci 2026-10-19-nabidka-vlna-2.sql.
-- Pokud měsíční částka PM vyjde pod práh, nabídka PM rozpočítá do etap místo mnoha drobných faktur.

alter table global_settings add column pm_min_monthly_invoice numeric not null default 5000;

-- Věta o měsíční fakturaci PM už není v nastavení – generuje se podle prahu (měsíčně / v ceně etap),
-- jinak by si text z nastavení protiřečil s vygenerovaným odstavcem.
alter table global_settings alter column md_payment_terms set default 'Nic nefakturujeme předem. Fakturu za každou etapu vystavujeme až po jejím uzavření a vašem schválení. Splatnost faktur je 14 dní.';

update global_settings
set md_payment_terms = 'Nic nefakturujeme předem. Fakturu za každou etapu vystavujeme až po jejím uzavření a vašem schválení. Splatnost faktur je 14 dní.'
where md_payment_terms = 'Nic nefakturujeme předem. Fakturu za každou etapu vystavujeme až po jejím uzavření a vašem schválení. Řízení projektu fakturujeme průběžně po měsících, abyste měli náklady rozložené v čase. Splatnost faktur je 14 dní.';
