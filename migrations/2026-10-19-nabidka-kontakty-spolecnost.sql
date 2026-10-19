-- Migrace: úprava textů nabídky (kontakty, řízení projektu, informace o společnosti)
-- Spustit jednou v Supabase SQL editoru před nasazením nové verze aplikace.
-- - kontakty: nový formát – jméno jako nadpis (###), pod ním obyčejné řádky (role, telefon, e-mail)
-- - řízení projektu: jméno tučně a rovnou za ním kontakty
-- - informace o společnosti: doplnit číslo účtu, pokud chybí

-- Kontakty: formát se mění, nastavuje se celý text znovu
update global_settings set md_contacts = '### Lydia Tomajková
Project lead, termíny a průběh projektu
776 376 585
lydia.tomajkova@svejda-goldmann.cz

### David Švejda
Design lead
602 384 820
david@svejda-goldmann.cz

### Jakub Goldmann
CEO, strategie a rozpočet
777 907 719
jakub@svejda-goldmann.cz';

-- Řízení projektu: jméno tučně + kontakty (jen pokud ještě není upraveno)
update global_settings
set md_pm_text = replace(md_pm_text, 'Lydii Tomajkovou', '**Lydii Tomajkovou** (776 376 585, lydia.tomajkova@svejda-goldmann.cz)')
where md_pm_text not like '%**Lydii Tomajkovou**%';

-- Informace o společnosti: doplnit číslo účtu, pokud chybí
update global_settings
set md_supplier_info = md_supplier_info || E'\nČíslo účtu: 2700976062 / 2010 (Fio)'
where md_supplier_info not like '%2700976062%';

-- Nové výchozí hodnoty pro případné budoucí řádky
alter table global_settings alter column md_contacts set default '### Lydia Tomajková
Project lead, termíny a průběh projektu
776 376 585
lydia.tomajkova@svejda-goldmann.cz

### David Švejda
Design lead
602 384 820
david@svejda-goldmann.cz

### Jakub Goldmann
CEO, strategie a rozpočet
777 907 719
jakub@svejda-goldmann.cz';
alter table global_settings alter column md_pm_text set default 'Po celou dobu projektu máte jednoho kontaktního člověka – **Lydii Tomajkovou** (776 376 585, lydia.tomajkova@svejda-goldmann.cz). Každý týden dostanete krátký status, hlídáme termíny, rozpočet i rozsah a koordinujeme celý tým tak, abyste se nemuseli starat o nic jiného než o zpětnou vazbu.';
alter table global_settings alter column md_supplier_info set default 'Švejda Goldmann, s.r.o.
Pernerova 293/11
186 00 Praha 8
IČ 04888189
DIČ CZ04888189
u MS v Praze, C 254389
DS hb6svz2
Číslo účtu: 2700976062 / 2010 (Fio)';
