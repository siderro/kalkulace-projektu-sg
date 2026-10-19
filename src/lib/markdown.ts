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

// Jedna věta hodnoty ke každé etapě pro Shrnutí – klient čte „co z toho bude mít“, ne výpis katalogu
const STAGE_VALUE: Record<SectionKey, string> = {
  pruzkum_a_pozice: 'pochopíme vaše uživatele, trh a zadání',
  koncept: 'navrhneme strukturu a logiku, ověříme ji s uživateli',
  vizualni_design: 'dáme webu tvář, která odpovídá vaší značce',
  programming: 'postavíme funkční web připravený ke spuštění',
};

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
    sections.push(`Pro: **${project.client_name.trim()}**${contact ? ` · ${contact}` : ''}`);
  }

  // Cíl projektu slovy klienta (pokud je vyplněn)
  if (project.goal.trim()) {
    sections.push(`## Cíl projektu\n\n${project.goal.trim()}`);
  }

  // Shrnutí: etapy s větou hodnoty, termíny, cena
  const scopeBullets = stages.map(
    ({ key, label, items }) =>
      `- **${label}** – ${STAGE_VALUE[key]}: ${items.map(({ def }) => def.label).join(', ')}`,
  );
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
      ...(screens.length > 0 ? [``, `Rozsah obrazovek je v tabulce „Přehled obrazovek“ níže.`] : []),
      ...(termLines.length > 0
        ? [
            ``,
            termLines.join('  \n'),
            ``,
            `Abychom termíny dodrželi, budeme od vás potřebovat podklady a zpětnou vazbu do 5 pracovních dnů od předání každé etapy.`,
          ]
        : []),
      ``,
      `Celková cena za projekt: **${formatCurrencyMd(summary.projectTotal)}** (bez DPH)  `,
      `Platíte vždy až za schválenou etapu – nic předem.`,
    ].join('\n'),
  );

  // Reference: projektový přepis má přednost, prázdné = sekce se netiskne
  const references = (project.references_override.trim() || settings.md_references).trim();
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

  // Přehled obrazovek patří k rozsahu – před cenu
  if (screens.length > 0) {
    sections.push(`### Přehled obrazovek\n\n${buildScreensTable(screens)}`);
  }

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
  sections.push(`### Řízení projektu\n\n${settings.md_pm_text.trim()}`);

  // Podpora po spuštění (volitelná, jen pokud je nastavena)
  if (project.sla_monthly_fee > 0) {
    sections.push(
      [
        `### Podpora po spuštění`,
        ``,
        `Po spuštění se o web dál staráme za měsíční paušál **${formatCurrencyMd(project.sla_monthly_fee)}/měsíc** (v ceně je zahrnuto ${summary.months} měs.). ${settings.md_support_text.trim()}`,
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
      settings.md_payment_terms.trim(),
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

  // Co nabídka nezahrnuje: globální seznam + projektové doplnění
  // (řádky bez odrážky doplníme o „- “, jinak by se slily do poslední položky)
  const exclusions = [settings.md_exclusions.trim(), asBulletList(project.exclusions_extra)]
    .filter(Boolean)
    .join('\n');
  if (exclusions) {
    sections.push(`### Co nabídka nezahrnuje\n\n${exclusions}`);
  }

  // Další postup: výzva k akci + závěr (Markdown z nastavení, předává se beze změny)
  sections.push(`## Další postup\n\n${settings.md_next_steps.trim()}`);

  // Kontakty (z nastavení)
  sections.push(`## Na koho se v ŠG obracet\n\n${hardBreaks(settings.md_contacts)}`);

  // Dodavatel (z nastavení)
  sections.push(`### Dodavatel\n\n${hardBreaks(settings.md_supplier_info)}`);

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

// Jednoduché odřádkování → tvrdý zlom řádku (jinak se v Google Docs řádky slijí)
function hardBreaks(text: string): string {
  return text.trim().replace(/([^\n])\n(?=[^\n])/g, '$1  \n');
}

// --- Screens table helper ---

function buildScreensTable(screens: ProjectScreen[]): string {
  const allFlags: { key: keyof ProjectScreen; label: string }[] = [
    // Názvy pro klienta; interní UI používá UX/UI terminologii
    { key: 'ux_primary_desktop', label: 'Wireframe – desktop' },
    { key: 'ux_secondary_mobile', label: 'Wireframe – mobil' },
    { key: 'ui_primary_desktop', label: 'Grafický návrh – desktop' },
    { key: 'ui_secondary_mobile', label: 'Grafický návrh – mobil' },
    { key: 'webflow', label: 'Nasazení ve Webflow' },
  ];

  // Vynechat sloupce, kde žádná obrazovka nemá zaškrtnutý flag
  const flagLabels = allFlags.filter((f) =>
    screens.some((s) => s[f.key]),
  );

  const header = `| # | Obrazovka | ${flagLabels.map((f) => f.label).join(' | ')} |`;
  const separator = `|---|-----------|${flagLabels.map(() => '---').join('|')}|`;

  const rows = screens.map((s, i) => {
    const flags = flagLabels
      .map((f) => (s[f.key] ? '✓' : '–'))
      .join(' | ');
    return `| ${i + 1} | ${s.name} | ${flags} |`;
  });

  return [header, separator, ...rows].join('\n');
}
