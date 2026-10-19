// ============================================================
// Markdown template generator — isolated from UI
// ============================================================

import {
  type Project,
  type ProjectScreen,
  type ProjectBillableItem,
  type BillableProductDefinition,
  type GlobalSettings,
  type SectionKey,
  SECTION_LABELS,
  WORK_TYPE_LABELS,
} from '../types';
import { type ProjectSummary, computeAdjustedItemPrice } from './calculations';
import {
  computeBillingMonths,
  formatCzechDate,
  formatCurrencyMd,
  formatDuration,
} from './formatting';

export interface MarkdownInput {
  project: Project;
  screens: ProjectScreen[];
  billableItems: ProjectBillableItem[];
  definitions: BillableProductDefinition[];
  summary: ProjectSummary;
  settings: GlobalSettings;
}

// Pořadí etap v nabídce (etapa = sekce katalogu)
const SECTION_ORDER: SectionKey[] = [
  'pruzkum_a_pozice',
  'koncept',
  'vizualni_design',
  'programming',
];

interface Stage {
  key: SectionKey;
  label: string;
  items: { item: ProjectBillableItem; def: BillableProductDefinition }[];
  total: number;
}

/**
 * Generate the complete Czech Markdown offer from project data.
 */
export function generateMarkdown(input: MarkdownInput): string {
  const { project, screens, billableItems, definitions, summary, settings } = input;

  const defMap = new Map(definitions.map((d) => [d.id, d]));
  const adjusted = (price: number) =>
    computeAdjustedItemPrice(price, project.complexity_coefficient_percent);

  // Jen zapnuté položky s nenulovou cenou – odvozené položky bez obrazovek se netisknou
  const enabledDefs = billableItems
    .filter((item) => item.enabled && adjusted(item.price_value) > 0)
    .map((item) => ({ item, def: defMap.get(item.product_definition_id)! }));

  // Etapy: položky seskupené po sekcích, prázdné sekce vynechány
  const stages: Stage[] = SECTION_ORDER.flatMap((key) => {
    const items = enabledDefs.filter(({ def }) => def.section_key === key);
    if (items.length === 0) return [];
    const total = items.reduce((sum, { item }) => sum + adjusted(item.price_value), 0);
    return [{ key, label: SECTION_LABELS[key], items, total }];
  });

  const sections: string[] = [];

  // Hlavička s verzí a datem
  sections.push(
    `**Verze ${project.version_label}** | ${formatCzechDate(project.project_date)}`,
  );

  sections.push(`# Cenová nabídka – ${project.name}`);

  // Komu je nabídka určena (pokud je vyplněn klient)
  if (project.client_name.trim()) {
    const contact = project.client_contact.trim();
    sections.push(`Pro: **${project.client_name.trim()}**${contact ? `, ${contact}` : ''}`);
  }

  // Cíl projektu slovy klienta (pokud je vyplněn)
  if (project.goal.trim()) {
    sections.push(`## Cíl projektu\n\n${project.goal.trim()}`);
  }

  // Shrnutí: jen názvy zaškrtnutých činností (v pořadí etap), termíny, cena
  const scopeBullets = stages.flatMap(({ items }) => items.map(({ def }) => `- ${def.label}`));
  const duration = formatDuration(project.start_date, project.end_date);
  const termLines = [
    ...(project.start_date ? [`Začátek projektu: **${formatCzechDate(project.start_date)}**`] : []),
    ...(project.end_date ? [`Předpokládané dokončení: **${formatCzechDate(project.end_date)}**`] : []),
    ...(duration ? [`Celková doba: **${duration}**`] : []),
  ];
  sections.push(
    [
      `## Shrnutí společného projektu`,
      ``,
      ...scopeBullets,
      ...(screens.length > 0 ? [``, `Rozsah obrazovek je v tabulce „Přehled obrazovek“ v příloze.`] : []),
      ...(termLines.length > 0 ? [``, termLines.join('  \n')] : []),
      ``,
      `Projekt závisí na vaší součinnosti – po každé iteraci od vás potřebujeme zpětnou vazbu, ideálně do 2 dnů.`,
      ``,
      `Celková cena za projekt: **${formatCurrencyMd(summary.projectTotal)}** (bez DPH)  `,
      `Platíte vždy až za schválenou etapu – nic předem.`,
    ].join('\n'),
  );

  // Reference: projektový přepis má přednost, prázdné = sekce se netiskne
  const references = stripTitle(project.references_override.trim() || settings.md_references, [
    'Referenční projekty', 'Reference', 'Podobné projekty', 'Podobné projekty, které jsme dělali',
  ]);
  if (references) {
    sections.push(`## Podobné projekty, které jsme dělali\n\n${references}`);
  }

  // Detailní rozsah: tabulka položek a cen per etapa, popisy jako odrážky s názvem položky
  const sectionBlocks = stages.map(({ label, items, total }) => {
    const rows = items.map(
      ({ item, def }) => `| ${def.label} | ${formatCurrencyMd(adjusted(item.price_value))} |`,
    );
    const descriptions = items
      .filter(({ def }) => def.description.trim())
      .map(({ def }) => `- **${def.label}** – ${def.description.trim()}`);
    return [
      `### ${label}`,
      ``,
      `| Položka | Cena |`,
      `|---------|------|`,
      ...rows,
      `| **Celkem ${label}** | **${formatCurrencyMd(total)}** |`,
      ...(descriptions.length > 0 ? [``, descriptions.join('\n')] : []),
    ].join('\n');
  });
  sections.push([`## Detailní rozsah projektu`, ``, sectionBlocks.join('\n\n')].join('\n'));

  // Celková cena (rozpad ceny; fakturace je níž v Platebních podmínkách)
  sections.push(
    [
      `### Celková cena`,
      ``,
      `| | Cena |`,
      `|---|---|`,
      `| Mezisoučet | ${formatCurrencyMd(summary.adjustedSubtotal)} |`,
      `| Řízení projektu (${project.pm_percent} %) | ${formatCurrencyMd(summary.pmAmount)} |`,
      ...(summary.slaTotal > 0
        ? [
            `| Podpora po spuštění (${summary.months} měs. × ${formatCurrencyMd(summary.slaMonthlyFee)}) | ${formatCurrencyMd(summary.slaTotal)} |`,
          ]
        : []),
      `| **Celková cena projektu** (bez DPH) | **${formatCurrencyMd(summary.projectTotal)}** |`,
    ].join('\n'),
  );

  // Řízení projektu: jen hodnota pro klienta (text z nastavení)
  sections.push(`### Řízení projektu\n\n${stripTitle(settings.md_pm_text, ['Řízení projektu', 'Projektový management'])}`);

  // Podpora po spuštění (volitelná, jen pokud je nastavena)
  if (project.sla_monthly_fee > 0) {
    sections.push(
      [
        `### Podpora po spuštění`,
        ``,
        `Po spuštění se o web dál staráme za měsíční paušál **${formatCurrencyMd(project.sla_monthly_fee)}/měsíc** (v ceně je zahrnuto ${summary.months} měs.). ${stripTitle(settings.md_support_text, ['Podpora po spuštění', 'SLA'])}`,
      ].join('\n'),
    );
  }

  // Fakturace PM: měsíčně jen když měsíční částka dává smysl, jinak rozpočítat do etap.
  // Měsíční částka se tiskne jen jako sazba za prodloužení – nikdy jako součin,
  // aby zaokrouhlení nerozbilo součet.
  const billingMonths = computeBillingMonths(project.start_date, project.end_date);
  const pmMonthly = billingMonths ? Math.round(summary.pmAmount / billingMonths) : null;
  const pmMonthlyBilling =
    billingMonths !== null && pmMonthly !== null && pmMonthly >= settings.pm_min_monthly_invoice;

  let milestoneRows: string[];
  let pmBillingParagraph: string;
  if (pmMonthlyBilling) {
    milestoneRows = [
      ...stages.map(
        ({ label, total }) => `| ${label} | po schválení etapy | ${formatCurrencyMd(total)} |`,
      ),
      `| Řízení projektu | měsíčně, ${billingMonths} ${pluralInvoices(billingMonths)} | ${formatCurrencyMd(summary.pmAmount)} |`,
    ];
    pmBillingParagraph = `Řízení projektu (${formatCurrencyMd(summary.pmAmount)}) fakturujeme průběžně – ${billingMonths} ${pluralInvoices(billingMonths)}, za každý započatý měsíc projektu. Částka vychází z předpokládané doby trvání projektu. Pokud by se projekt prodloužil z důvodů na straně klienta, dovolíme si za každý další započatý měsíc účtovat ${formatCurrencyMd(pmMonthly)}; vždy vás na to upozorníme předem.`;
  } else {
    const pmShares = distributeProportionally(summary.pmAmount, stages.map((s) => s.total));
    milestoneRows = stages.map(
      ({ label, total }, i) =>
        `| ${label} (vč. řízení projektu) | po schválení etapy | ${formatCurrencyMd(total + pmShares[i])} |`,
    );
    pmBillingParagraph = `Řízení projektu je u tohoto rozsahu zahrnuto v ceně jednotlivých etap.`;
  }
  if (summary.slaTotal > 0) {
    milestoneRows.push(
      `| Podpora po spuštění | měsíčně po spuštění | ${formatCurrencyMd(summary.slaMonthlyFee)}/měs. |`,
    );
  }

  // Platební podmínky: princip z nastavení, milníky, fakturace PM, formality
  sections.push(
    [
      `### Platební podmínky`,
      ``,
      stripTitle(settings.md_payment_terms, ['Platební podmínky']),
      ``,
      `| Etapa | Fakturujeme | Částka |`,
      `|-------|-------------|--------|`,
      ...milestoneRows,
      ``,
      pmBillingParagraph,
      ``,
      `- Všechny ceny jsou uvedeny bez DPH.`,
      `- Nabídka je platná 30 dní od data vystavení.`,
      ...(project.notes.trim() ? [``, `**Poznámky:** ${project.notes.trim()}`] : []),
    ].join('\n'),
  );

  // Co nabídka nezahrnuje: text z košilky, prázdné = výchozí z Nastavení
  // (řádky bez odrážky doplníme o „- “, jinak by se slily do poslední položky)
  const exclusions = asBulletList(
    stripTitle(project.exclusions_extra.trim() || settings.md_exclusions, ['Co nabídka nezahrnuje']),
  );
  if (exclusions) {
    sections.push(`### Co nabídka nezahrnuje\n\n${exclusions}`);
  }

  // Další postup: výzva k akci + závěr (Markdown z nastavení, předává se beze změny)
  sections.push(`## Další postup\n\n${stripTitle(settings.md_next_steps, ['Další postup'])}`);

  // Kontakty (z nastavení): jména jako H3, pod nimi obyčejný text
  sections.push(`## Na koho se v ŠG obracet\n\n${hardBreaks(stripTitle(settings.md_contacts, ['Kontakty', 'Kontaktní osoby', 'Na koho se v ŠG obracet'], false))}`);

  // Základní informace o společnosti (z nastavení): jeden odstavec, položky oddělené čárkami
  sections.push(
    `### Základní informace o společnosti\n\n${plainCommaList(stripTitle(settings.md_supplier_info, ['Dodavatel', 'Základní informace o společnosti', 'Fakturační údaje'], false))}`,
  );

  // Přílohy: přehled obrazovek úplně na konci
  if (screens.length > 0) {
    sections.push(
      [`## Přílohy`, ``, `### Přehled obrazovek`, ``, buildScreensTable(screens, definitions)].join(
        '\n',
      ),
    );
  }

  return sections.join('\n\n');
}

// Rozdělí částku poměrně k vahám; zaokrouhlovací rozdíl nese poslední podíl, aby součet seděl na korunu
function distributeProportionally(amount: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0 || totalWeight <= 0) return weights.map(() => 0);
  const shares = weights.map((w) => Math.round((amount * w) / totalWeight));
  const assigned = shares.slice(0, -1).reduce((a, b) => a + b, 0);
  shares[shares.length - 1] = amount - assigned;
  return shares;
}

// Každý neprázdný řádek jako odrážka; existující „- “ / „* “ se zachová
function asBulletList(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (/^[-*]\s/.test(line) ? line : `- ${line}`))
    .join('\n');
}

// Skloňování: 1 faktura, 2–4 faktury, 5+ faktur
function pluralInvoices(n: number): string {
  if (n === 1) return 'faktura';
  if (n >= 2 && n <= 4) return 'faktury';
  return 'faktur';
}

// Jednoduché odřádkování → tvrdý zlom řádku (jinak se v Google Docs řádky slijí);
// řádky s nadpisem (#) se nechávají beze změny
function hardBreaks(text: string): string {
  return text
    .trim()
    .split('\n')
    .map((line, i, lines) => {
      const next = lines[i + 1];
      const needsBreak = line !== '' && !line.startsWith('#') && next !== undefined && next !== '';
      return needsBreak ? `${line}  ` : line;
    })
    .join('\n');
}

// Odstraní z textu z nastavení úvodní nadpis, který už generuje šablona (jinak je v nabídce dvakrát).
// Maže úvodní řádky, které se shodují s některým z názvů (i s #, ** nebo dvojtečkou);
// s anyHeading maže i jakýkoliv úvodní Markdown nadpis (#).
function stripTitle(text: string, titles: string[], anyHeading = true): string {
  const norm = (t: string) =>
    t.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/:\s*$/, '').trim().toLowerCase();
  const known = titles.map(norm);
  const lines = text.trim().split('\n');
  while (lines.length > 0) {
    const line = lines[0].trim();
    if (line === '' || known.includes(norm(line)) || (anyHeading && /^#+\s/.test(line))) {
      lines.shift();
    } else {
      break;
    }
  }
  return lines.join('\n').trim();
}

// Víceřádkový text → jeden odstavec plaintextu, položky oddělené čárkami (bez Markdown formátování)
function plainCommaList(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/\*\*/g, '').trim())
    .filter(Boolean)
    .join(', ');
}

// --- Screens table helper ---

function buildScreensTable(
  screens: ProjectScreen[],
  definitions: BillableProductDefinition[],
): string {
  // Záhlaví sloupců = stejné popisky jako položky v tabulkách rozsahu (z katalogu),
  // záložně interní popisek typu práce
  const flagKeys = [
    'ux_primary_desktop',
    'ux_secondary_mobile',
    'ui_primary_desktop',
    'ui_secondary_mobile',
    'webflow',
  ] as const;
  const allFlags: { key: (typeof flagKeys)[number]; label: string }[] = flagKeys.map((key) => ({
    key,
    label: definitions.find((d) => d.source_key === key)?.label ?? WORK_TYPE_LABELS[key],
  }));

  // Vynechat sloupce, kde žádná obrazovka nemá zaškrtnutý flag
  const flagLabels = allFlags.filter((f) =>
    screens.some((s) => s[f.key]),
  );

  const header = `| # | Obrazovka | ${flagLabels.map((f) => f.label).join(' | ')} |`;
  const separator = `|---|-----------|${flagLabels.map(() => '---').join('|')}|`;

  const rows = screens.map((s, i) => {
    const flags = flagLabels
      .map((f) => (s[f.key] ? '✅' : '–'))
      .join(' | ');
    return `| ${i + 1} | ${s.name} | ${flags} |`;
  });

  return [header, separator, ...rows].join('\n');
}
