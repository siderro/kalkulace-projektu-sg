-- Migrace: prodejní vylepšení nabídky, 2. vlna
-- Spustit po migraci 2026-10-19-fakturace-po-etapach.sql.
-- - klient a kontaktní osoba klienta v hlavičce nabídky
-- - „Co nabídka nezahrnuje“ (globální seznam + doplnění per projekt)
-- - reference (globální výchozí + přepis per projekt); sekce se netiskne, dokud je text prázdný
-- - text „co zahrnuje podpora po spuštění“ v nastavení

alter table projects add column client_name text not null default '';
alter table projects add column client_contact text not null default '';
alter table projects add column exclusions_extra text not null default '';
alter table projects add column references_override text not null default '';

alter table global_settings add column md_exclusions text not null default '- Copywriting a tvorba textů
- Fotografie, ilustrace a videa
- Hosting, domény a licence (fonty, pluginy)
- Plnění obsahu do redakčního systému
- Překlady do dalších jazyků';

alter table global_settings add column md_support_text text not null default 'Zahrnuje reakci na vaše požadavky do 2 pracovních dnů, pravidelné aktualizace a drobné úpravy obsahu v rozsahu do 2 hodin měsíčně.';

-- Reference: placeholder „na vyžádání“ by se tiskl jako prázdný slib – vyprázdnit,
-- sekce se objeví až po doplnění skutečných referencí v nastavení.
alter table global_settings alter column md_references set default '';
update global_settings set md_references = '' where md_references = 'Vybrané projekty na vyžádání.';
