# AI Prompt — Aplikuj backoffice styl na můj projekt

Zkopíruj tento prompt do Claude, ChatGPT nebo jiného AI nástroje spolu se souborem `styles.css`.

---

## Prompt

```
Nastyluj moji aplikaci podle přiloženého CSS souboru a těchto designových principů:

FILOZOFIE:
- Interní backoffice tool — hustý, funkční, bez dekorací
- Desktop-first, žádné mobile breakpointy
- Priorita: čitelnost dat a efektivní práce

TYPOGRAFIE:
- Nadpisy: Inter (sans-serif), bold
- Všechno ostatní (body, inputy, tabulky): Roboto Mono (monospace)
- Base: 14px, line-height 1.5
- Přidej Google Fonts: Inter 400/600/700 + Roboto Mono 400/600

BARVY:
- Pozadí stránky: #f8f9fa (světle šedé)
- Karty/inputy: #ffffff (bílé)
- Text: #212529, sekundární text: #6c757d
- Bordery: #dee2e6
- Primární akce (buttony, linky, aktivní tab): #0d6efd
- Danger: #dc3545, Success: #198754, Warning: #ffc107
- Všechny barvy definuj jako CSS custom properties v :root

LAYOUT:
- Flexbox layout, min-height 100vh
- Header: bílý, spodní border, padding 8px 16px
- Hlavní obsah: max-width 1200px, centrovaný, padding 16px 24px

KOMPONENTY:
- Buttony: 13px, monospace font, 4px radius, tři varianty (default/primary/danger)
- Taby: horizontální, spodní border 2px, aktivní = modrý
- Tabulky: bez vnějšího borderu, jen spodní border na řádcích, uppercase hlavičky 12px
- Formuláře: 2-sloupcový grid, labely 12px bold šedé, inputy monospace
- Karty: bílé pozadí, 1px border, 6px radius, 16px padding

STRIKTNÍ PRAVIDLA:
- Žádné box-shadow
- Žádné gradienty
- Žádné animace/transitions
- Number spinnery globálně skryté
- Žádné zaoblení větší než 8px
- Všechny interaktivní elementy musí mít hover stav

Použij přiložený CSS soubor jako referenci a adaptuj ho na strukturu mého projektu.
Zachovej CSS custom properties pro snadnou customizaci.
```

---

## Jak použít

1. Zkopíruj prompt výše
2. Přilož soubor `styles.css` jako kontext
3. Přilož svůj vlastní kód (nebo řekni AI, jaký framework používáš)
4. AI ti adaptuje styly na tvůj projekt
