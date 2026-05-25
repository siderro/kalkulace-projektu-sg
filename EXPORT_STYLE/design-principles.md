# Design Principles — Backoffice Tool Style

## Filosofie

Styl je navržený pro **interní backoffice nástroje** — hustý, funkční, bez zbytečných dekorací. Desktop-first přístup. Prioritou je čitelnost dat a efektivní práce, ne vizuální wow efekt.

---

## Typografie

| Účel | Font | Fallback |
|------|-------|----------|
| Nadpisy (h1–h6) | **Inter** | sans-serif |
| Tělo, inputy, data | **Roboto Mono** | monospace |

- Base font-size: **14px**, line-height: **1.5**
- Monospace font zajišťuje zarovnání čísel a dat ve sloupcích
- Nadpisy používají Inter pro vizuální odlišení od datového obsahu

**Google Fonts link:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto+Mono:wght@400;600&display=swap" rel="stylesheet">
```

---

## Barevná paleta

### Základní barvy
| Proměnná | Hodnota | Použití |
|----------|---------|---------|
| `--bg` | `#f8f9fa` | Pozadí stránky |
| `--surface` | `#ffffff` | Karty, modaly, inputy |
| `--text` | `#212529` | Hlavní text |
| `--text-muted` | `#6c757d` | Sekundární text, labely |
| `--border` | `#dee2e6` | Ohraničení, oddělovače |

### Akcentové barvy
| Proměnná | Hodnota | Použití |
|----------|---------|---------|
| `--primary` | `#0d6efd` | Primární akce, aktivní tab, linky |
| `--primary-hover` | `#0b5ed7` | Hover stav primární barvy |
| `--danger` | `#dc3545` | Destruktivní akce, chyby |
| `--success` | `#198754` | Úspěch, potvrzení |
| `--warning` | `#ffc107` | Varování, nesaved stav |

### Stavové barvy pozadí
| Proměnná | Hodnota | Použití |
|----------|---------|---------|
| `--derived-bg` | `#e8f4fd` | Odvozené/vypočítané řádky |
| `--overridden-bg` | `#fff3cd` | Přepsané/upravené hodnoty |

---

## Spacing a Layout

- **Padding hlavního obsahu:** 16px vertikálně, 24px horizontálně
- **Max-width obsahu:** 1200px, centrovaný (`margin: 0 auto`)
- **Gap ve form gridu:** 12px
- **Padding header:** 8px 16px
- **Border-radius:** 4px (inputy, buttony), 6px (karty/sekce), 8px (modaly)

### Hustota
Styl je záměrně **hustý** — malé paddingy, kompaktní tabulky. Toto není marketing web, je to pracovní nástroj.

---

## Komponenty

### Buttony
- Základní: bílý s border, hover šedý
- Primary: modrý (`--primary`), bílý text
- Danger: červený border a text, hover růžové pozadí
- Small varianta: menší padding a font
- Link button: žádný background/border, podtržený

### Taby
- Horizontální řada, spodní border 2px
- Aktivní tab: modrý text + modrý spodní border
- Neaktivní: šedý text (`--text-muted`)
- Font: monospace (jako zbytek UI)

### Tabulky
- Bez vnějšího borderu, jen spodní border na řádcích
- Hlavička: uppercase, letter-spacing, menší font, šedá barva
- Kompaktní padding: 6px 10px

### Formuláře
- 2-sloupcový grid (max-width 700px)
- Label: 12px, bold, šedý (`--text-muted`)
- Input: 14px, monospace, 1px border, 4px radius
- Nikdy number spinnery (globálně skryté)

### Karty / Sekce
- Bílé pozadí, 1px border, 6px radius, 16px padding

### Badges
- Pill shape (border-radius: 10px)
- 11px font, kompaktní padding
- Tři varianty: default (šedý), info (modrý), warning (žlutý)

---

## Pravidla

1. **Žádné stíny** — všechno je flat, oddělené borderem
2. **Žádné gradienty** — čisté solid barvy
3. **Žádné animace** — okamžitá odezva
4. **Monospace všude** — kromě nadpisů
5. **Number spinnery vždy skryté**
6. **Desktop-first** — neřeší se mobile breakpointy
7. **Neutrální tón** — Bootstrap-like paleta, nic křiklavého
