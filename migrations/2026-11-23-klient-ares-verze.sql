-- Migrace: údaje klienta z ARES, vypnutí referencí, cena v seznamu projektů
-- Spustit jednou v Supabase SQL editoru před nasazením nové verze aplikace.

alter table projects add column if not exists client_ico text not null default '';
alter table projects add column if not exists client_address text not null default '';
alter table projects add column if not exists client_dic text not null default '';

-- true = sekce referencí se do nabídky netiskne
alter table projects add column if not exists references_disabled boolean not null default false;

-- celková cena nabídky, ukládá se při uložení projektu (pro seznam projektů)
alter table projects add column if not exists offer_total numeric not null default 0;
