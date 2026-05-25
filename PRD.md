# PRD — Kalkulace projektu SG

## 1. Přehled

**Produkt:** Interní kalkulačka cenových nabídek pro digitální agenturu Švejda Goldmann.

**Problém:** Nabídky se dříve tvořily ručně v Google Tabulkách — hodně ruční práce, chybovost, náchylnost k rozbití.

**Řešení:** Webová aplikace, která automaticky generuje cenové nabídky z definovaných obrazovek a produktů s konzistentním výstupem v Markdown.

**Stav:** Aplikace je nasazená a aktivně se používá. Průběžně se vylepšuje.

---

## 2. Uživatelé

- **Cílová skupina:** Vedení agentury / experti (úzká skupina, jednotky uživatelů)
- **Role:** Jedna role — všichni uživatelé mají stejná oprávnění
- **Autentizace:** Google OAuth, omezeno na doménu `svejda-goldmann.cz`

---

## 3. Klíčové workflow

1. Uživatel založí nový projekt
2. Vyplní **košilku** (název, sazby, koeficient složitosti, PM %, SLA aj.)
3. Přidá **obrazovky** s jednotlivými flagy (UX, UI, Webflow) a složitostí 1–5
4. Zkontroluje / upraví **billable produkty** (některé se derivují z obrazovek, některé jsou manuální)
5. Přejde na **výstup** — vygeneruje se Markdown nabídka
6. Zkopíruje Markdown a vloží do Google Dokumentu

---

## 4. Hlavní funkce (v1 — aktuální)

### 4.1 Košilka
- Projektové údaje: název, verze, datum
- Sazby: hodinová, MD, programování/hod
- Koeficient složitosti projektu
- PM procento
- SLA měsíční poplatek
- První mobilní sada (flag)
- Dny do startu, předpokládaný start

### 4.2 Obrazovky
- Seznam obrazovek s názvem, složitostí (1–5), poznámkou
- Flagy pro jednotlivé pracovní typy: UX desktop, UX mobil, UI desktop, UI mobil, Webflow
- Slouží jako kalkulační zdroj pro odvozené billable produkty

### 4.3 Billable produkty
- Seskupené do sekcí (Průzkum a pozice, Koncept, Vizuální design, Programming)
- Typy: manuální (default) nebo odvozené z kalkulátoru obrazovek
- Každý produkt lze zaškrtnout/odškrtnout v rámci projektu
- Odvozené hodnoty se přepočítávají z obrazovek

### 4.4 Výstup (Markdown)
- Jedna šablona generující kompletní českou nabídku
- Sekce: hlavička, cenový odhad, informace o firmě, kontakty, reference, management summary, přehled obrazovek, produkty po sekcích, shrnutí, PM, SLA, další spolupráce
- České formátování: desetinná čárka, `53 136 Kč`, `10. dubna 2026`

---

## 5. Kalkulační pravidla

### Obrazovky → MD
- Každý pracovní typ má **base MD při složitosti 5** (kalibrace v DB)
- Složitost: 1=20%, 2=40%, 3=60%, 4=80%, 5=100%
- Vzorec: `computed_md = base_md * complexity_percentage`
- Součet přes všechny obrazovky podle pracovního typu

### Koeficient složitosti projektu
- Násobí celkový billable subtotal
- **Neaplikuje se** na SLA

### PM
- Procento z **upraveného** billable subtotalu (po koeficientu složitosti)

### SLA
- Fixní měsíční částka, oddělená od výpočtu

---

## 6. Plánované funkce (backlog)

### 6.1 Vylepšení výstupu
- Lepší formátování Markdown šablony
- Více šablon pro různé typy nabídek
- Podmíněné sekce (zobrazení/skrytí částí nabídky podle kontextu)

### 6.2 Správa produktů
- UI pro přidávání a editaci billable produktů a sekcí přímo v aplikaci

### 6.3 Globální nastavení
- UI pro správu globálních defaults (sazby, kalibrace) — zatím nerozhodnuto

---

## 7. Technické omezení

- **Stack:** Vite + React + TypeScript, Supabase, GitHub Pages
- **Architektura:** Výpočty, formátování a Markdown generování jsou oddělené čisté funkce
- **Prostředí:** Pouze online, desktop-first, pouze čeština
- **UI princip:** Interní backoffice — efektivní, srozumitelné, bez zbytečností

### Mimo scope v1
- Audit log, systém rolí, verzování v DB
- Rich editor pro Markdown, DOCX export
- Pokročilé vyhledávání, dark mode

---

## 8. Úspěch

Aplikace je úspěšná, když:
- Nabídku lze vytvořit rychleji a s menší chybovostí než v Google Tabulkách
- Výstup je konzistentní a copy-ready pro Google Docs
- Experti ji používají jako primární nástroj pro tvorbu nabídek
