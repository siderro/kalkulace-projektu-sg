-- Migrace: prodejní texty v nabídce
-- - cíl/zadání projektu (per projekt)
-- - platební podmínky, text o projektovém managementu, další postup (globální nastavení)
-- Spustit jednou v Supabase SQL editoru před nasazením nové verze aplikace.

alter table projects add column goal text not null default '';

alter table global_settings add column md_payment_terms text not null default '50 % ceny fakturujeme zálohově při objednávce, zbývajících 50 % při předání projektu. Splatnost faktur je 14 dní.';

alter table global_settings add column md_pm_text text not null default 'Po celou dobu projektu máte jednoho kontaktního člověka – Lydii Tomajkovou. Každý týden dostanete krátký status, hlídáme termíny, rozpočet i rozsah a koordinujeme celý tým tak, abyste se nemuseli starat o nic jiného než o zpětnou vazbu.';

alter table global_settings add column md_next_steps text not null default '1. Potvrdíte nám nabídku (stačí e-mailem).
2. Pošleme zálohovou fakturu a návrh termínu kick-off schůzky.
3. Na kick-offu si projdeme zadání, podklady a harmonogram.
4. Startujeme první fází projektu.

Těšíme se na spolupráci.';
