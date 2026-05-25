# CLAUDE.md — Kalkulace projektu SG

## Project overview

Interní kalkulačka cenových nabídek pro digitální agenturu Švejda Goldmann. Generuje české Markdown nabídky z definovaných obrazovek a billable produktů. Výstup se kopíruje do Google Docs.

Viz `PRD.md` pro kompletní product requirements.

## Stack

- **App:** Vite 8 + React 19 + TypeScript 6
- **DB:** Supabase (PostgreSQL + Google OAuth, doména `svejda-goldmann.cz`)
- **Hosting:** GitHub Pages
- **Žádný router, žádný state management library** — čistý React state + hooks

## Commands

```bash
npm run dev       # lokální dev server (http://localhost:5173/kalkulace-projektu-sg/)
npm run build     # tsc -b && vite build
npm run lint      # eslint
```

## Project structure

```
src/
  App.tsx                  # hlavní layout, tabs, orchestrace
  types.ts                 # všechny TypeScript typy
  main.tsx                 # entry point
  index.css                # globální styly
  components/
    Auth.tsx               # login screen
    Kosilka.tsx            # tab: projektové údaje a sazby
    Screens.tsx            # tab: obrazovky s flagy a složitostí
    BillableProducts.tsx   # tab: billable produkty (manuální + odvozené)
    MarkdownOutput.tsx     # tab: vygenerovaný Markdown výstup
    ProjectList.tsx        # výběr/vytvoření projektu
    CatalogList.tsx        # seznam katalogů
    CatalogDetail.tsx      # detail katalogu
    GlobalSettings.tsx     # globální nastavení
  lib/
    calculations.ts        # PURE FUNCTIONS — výpočty (screens→MD, subtotals, PM, SLA)
    formatting.ts          # české formátování čísel, měn, dat
    markdown.ts            # Markdown šablona — generuje string, izolované od UI
    db.ts                  # Supabase CRUD operace
    defaults.ts            # výchozí hodnoty
    supabase.ts            # Supabase client init
  hooks/
    useProject.ts          # stav projektu + přepočty
    useAuth.ts             # autentizace
    useGlobalSettings.ts   # globální nastavení
supabase-schema.sql        # SQL schema pro Supabase
docs/
  Product rules.md
  Calculation rules.md
  Data model.md
  Markdown template spec.md
  Technical constraints.md
```

## Architecture rules

- **Výpočty jsou pure functions** — oddělené od UI (`lib/calculations.ts`)
- **Formátování je oddělené od výpočtů** (`lib/formatting.ts`)
- **Markdown generování přijímá typed data, vrací string** (`lib/markdown.ts`)
- Globální nastavení + kalibrace + definice se načtou jednou; stav projektu per session
- Odvozené billable items se přepočítávají client-side z obrazovek

## Coding conventions

- **Komunikace s uživatelem: česky** — odpovídej česky, piš commit messages česky
- Jazyk UI a komentářů: **čeština**
- NIKDY nepoužívat number spinnery — jsou globálně skryté přes CSS (`-webkit-appearance: none`, `-moz-appearance: textfield`)
- Preferovat jednoduchost — žádný overengineering
- Nepřidávat funkce nad rámec zadání
- Netvořit dokumentační soubory, pokud nejsou explicitně vyžádány

## Calculation gotchas

- Složitost obrazovky: 1=20%, 2=40%, 3=60%, 4=80%, 5=100% (konstanty, ne z DB)
- SLA se NENÁSOBÍ koeficientem složitosti projektu
- PM je % z upraveného subtotalu (PO aplikaci koeficientu složitosti)
- Vzorec: `computed_md = base_md_at_level_5 * complexity_percentage`

## Tech gotchas

- Vite 8 vyžaduje explicitně nainstalovaný `tslib` kvůli Supabase
- `vite.config.ts` má `base: '/kalkulace-projektu-sg/'` pro GitHub Pages
- Schema se aplikuje ručně v Supabase SQL editoru (`supabase-schema.sql`)
