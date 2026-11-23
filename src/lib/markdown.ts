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
  addDaysIso,
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

// Platnost nabídky od data verze
const OFFER_VALIDITY_DAYS = 30;

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
 * Generate the complete Czech Markdown offer from project data and the offer template.
 */
export function generateMarkdown(input: MarkdownInput, template: string): string {
  return renderTemplate(template, buildTemplateData(input));
}

// Hodnoty pro značky šablony: čísla už naformátovaná, tabulky hotové jako Markdown.
// Texty nabídky jsou v šabloně (sablona/nabidka.md, nahrává se do Supabase), tady jen data.
export function buildTemplateData(input: MarkdownInput): TemplateData {
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

  // Termíny: každý údaj na vlastní řádek (tvrdý zlom, jinak se v Google Docs slijí)
  const duration = formatDuration(project.start_date, project.end_date);
  const termLines = [
    ...(project.start_date ? [`Začátek projektu: **${formatCzechDate(project.start_date)}**`] : []),
    ...(project.end_date ? [`Předpokládané dokončení: **${formatCzechDate(project.end_date)}**`] : []),
    ...(duration ? [`Celková doba: **${duration}**`] : []),
  ];

  // Detailní rozsah: tabulka položek a cen per etapa, popisy jako odrážky s názvem položky
  const stageBlocks = stages.map(({ label, items, total }) => {
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

  // Fakturace PM: měsíčně jen když měsíční částka dává smysl, jinak rozpočítat do etap.
  // Měsíční částka se tiskne jen jako sazba za prodloužení – nikdy jako součin,
  // aby zaokrouhlení nerozbilo součet.
  const billingMonths = computeBillingMonths(project.start_date, project.end_date);
  const pmMonthly = billingMonths ? Math.round(summary.pmAmount / billingMonths) : null;
  const pmMonthlyBilling =
    billingMonths !== null && pmMonthly !== null && pmMonthly >= settings.pm_min_monthly_invoice;

  let milestoneRows: string[];
  if (pmMonthlyBilling) {
    milestoneRows = [
      ...stages.map(
        ({ label, total }) => `| ${label} | po schválení etapy | ${formatCurrencyMd(total)} |`,
      ),
      `| Řízení projektu | měsíčně, ${billingMonths} ${pluralInvoices(billingMonths)} | ${formatCurrencyMd(summary.pmAmount)} |`,
    ];
  } else {
    const pmShares = distributeProportionally(summary.pmAmount, stages.map((s) => s.total));
    milestoneRows = stages.map(
      ({ label, total }, i) =>
        `| ${label} (vč. řízení projektu) | po schválení etapy | ${formatCurrencyMd(total + pmShares[i])} |`,
    );
  }
  if (summary.slaTotal > 0) {
    milestoneRows.push(
      `| Podpora po spuštění | měsíčně po spuštění | ${formatCurrencyMd(summary.slaMonthlyFee)}/měs. |`,
    );
  }

  // Reference a výluky: projektový přepis z košilky má přednost, prázdné = výchozí z Nastavení
  const references = project.references_disabled
    ? ''
    : stripTitle(project.references_override.trim() || settings.md_references, [
        'Referenční projekty', 'Reference', 'Podobné projekty', 'Podobné projekty, které jsme dělali',
      ]);
  // (řádky bez odrážky doplníme o „- “, jinak by se slily do poslední položky)
  const exclusions = asBulletList(
    stripTitle(project.exclusions_extra.trim() || settings.md_exclusions, ['Co nabídka nezahrnuje']),
  );

  return {
    verze: project.version_label,
    datum: formatCzechDate(project.project_date),
    platnost_do: formatCzechDate(addDaysIso(project.project_date, OFFER_VALIDITY_DAYS)),
    nazev: project.name,
    klient: project.client_name.trim(),
    kontakt_klienta: project.client_contact.trim(),
    klient_adresa: project.client_address.trim(),
    klient_ico: project.client_ico.trim(),
    klient_dic: project.client_dic.trim(),
    cil: project.goal.trim(),
    rozsah: stages.flatMap(({ items }) => items.map(({ def }) => `- ${def.label}`)).join('\n'),
    terminy: termLines.join('  \n'),
    cena_celkem: formatCurrencyMd(summary.projectTotal),
    reference: references,
    etapy: stageBlocks.join('\n\n'),
    mezisoucet: formatCurrencyMd(summary.adjustedSubtotal),
    pm_procent: String(project.pm_percent),
    pm_cena: formatCurrencyMd(summary.pmAmount),
    pm_mesicne: pmMonthlyBilling,
    pm_faktur: billingMonths ? `${billingMonths} ${pluralInvoices(billingMonths)}` : '',
    pm_mesicni_sazba: pmMonthly !== null ? formatCurrencyMd(pmMonthly) : '',
    podpora: project.sla_monthly_fee > 0,
    podpora_v_cene: summary.slaTotal > 0,
    podpora_mesicne: formatCurrencyMd(project.sla_monthly_fee),
    podpora_mesicu: String(summary.months),
    podpora_celkem: formatCurrencyMd(summary.slaTotal),
    tabulka_fakturace: [
      `| Etapa | Fakturujeme | Částka |`,
      `|-------|-------------|--------|`,
      ...milestoneRows,
    ].join('\n'),
    poznamky: project.notes.trim(),
    vyluky: exclusions,
    obrazovky: screens.length > 0,
    tabulka_obrazovek: screens.length > 0 ? buildScreensTable(screens, definitions) : '',
  };
}

// --- Šablona ---
// {{x}} = hodnota, {{#x}}…{{/x}} = jen když x je vyplněné/pravdivé, {{^x}}…{{/x}} = jen když není.
// Řádek, na kterém je jen značka bloku, zmizí celý; víc prázdných řádků za sebou se sloučí do jednoho.
// Komentáře <!-- … --> se netisknou. Neznámá značka zůstane ve výstupu, aby byl překlep vidět.

export type TemplateData = Record<string, string | boolean>;

export function renderTemplate(template: string, data: TemplateData): string {
  const standalone = template
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[ \t]*(\{\{[#^/]\w+\}\})[ \t]*\r?\n/gm, '$1');
  return renderBlocks(standalone, data)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderBlocks(template: string, data: TemplateData): string {
  const withBlocks = template.replace(
    /\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g,
    (_, kind: string, key: string, inner: string) => {
      const on = Boolean(data[key]);
      return (kind === '#') === on ? renderBlocks(inner, data) : '';
    },
  );
  return withBlocks.replace(/\{\{(\w+)\}\}/g, (tag, key: string) =>
    key in data && typeof data[key] === 'string' ? (data[key] as string) : tag,
  );
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

// Odstraní z textu úvodní nadpis, který už generuje šablona (jinak je v nabídce dvakrát).
// Maže úvodní řádky, které se shodují s některým z názvů (i s #, ** nebo dvojtečkou)
// a jakýkoliv úvodní Markdown nadpis (#).
function stripTitle(text: string, titles: string[]): string {
  const norm = (t: string) =>
    t.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/:\s*$/, '').trim().toLowerCase();
  const known = titles.map(norm);
  const lines = text.trim().split('\n');
  while (lines.length > 0) {
    const line = lines[0].trim();
    if (line === '' || known.includes(norm(line)) || /^#+\s/.test(line)) {
      lines.shift();
    } else {
      break;
    }
  }
  return lines.join('\n').trim();
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
