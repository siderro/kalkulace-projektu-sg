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
  formatDecimal,
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

/**
 * Generate the complete Czech Markdown offer from project data.
 */
export function generateMarkdown(input: MarkdownInput): string {
  const { project, screens, billableItems, definitions, summary, settings } = input;

  const defMap = new Map(definitions.map((d) => [d.id, d]));
  const adjusted = (price: number) =>
    computeAdjustedItemPrice(price, project.complexity_coefficient_percent);

  const enabledItems = billableItems.filter((item) => item.enabled);
  const enabledDefs = enabledItems.map((item) => ({
    item,
    def: defMap.get(item.product_definition_id)!,
  }));

  const sections: string[] = [];

  // Hlavička s verzí a datem
  sections.push(
    `**Verze ${project.version_label}** | ${formatCzechDate(project.project_date)}`,
  );

  sections.push(`# Cenový odhad – ${project.name}`);

  // Cíl projektu slovy klienta (pokud je vyplněn)
  if (project.goal.trim()) {
    sections.push(`## Cíl projektu\n\n${project.goal.trim()}`);
  }

  // Shrnutí: výčet rozsahu, termíny, cena
  const firstScreenDerived = enabledDefs.findIndex(
    ({ def }) => def.calculation_type === 'derived_from_screens',
  );
  const scopeBullets = enabledDefs.map(({ def }, i) =>
    i === firstScreenDerived && screens.length > 0
      ? `- ${def.label} – scope stránek je definován v tabulce`
      : `- ${def.label}`,
  );
  const termLines = [
    ...(project.start_date ? [`Začátek projektu: **${formatCzechDate(project.start_date)}**`] : []),
    ...(project.end_date ? [`Předpokládané dokončení: **${formatCzechDate(project.end_date)}**`] : []),
    ...(formatDuration(project.start_date, project.end_date)
      ? [`Celková doba: **${formatDuration(project.start_date, project.end_date)}**`]
      : []),
  ];
  sections.push(
    [
      `## Shrnutí společného projektu`,
      ``,
      ...scopeBullets,
      ...(termLines.length > 0
        ? [
            ``,
            termLines.join('  \n'),
            ``,
            `Termíny platí při dodání podkladů a zpětné vazby do 5 pracovních dnů od předání každé fáze.`,
          ]
        : []),
      ``,
      `Celková cena za projekt: **${formatCurrencyMd(summary.projectTotal)}** (bez DPH)`,
    ].join('\n'),
  );

  // Detailní rozsah: tabulky po sekcích
  const sectionKeys: SectionKey[] = [
    'pruzkum_a_pozice',
    'koncept',
    'vizualni_design',
    'programming',
  ];

  const sectionBlocks: string[] = [];
  // Etapy pro fakturační milníky (etapa = sekce nabídky)
  const stages: { label: string; total: number }[] = [];
  for (const sectionKey of sectionKeys) {
    const sectionItems = enabledDefs.filter(
      ({ def }) => def.section_key === sectionKey,
    );
    if (sectionItems.length === 0) continue;

    const sectionLabel = SECTION_LABELS[sectionKey];
    const rows: string[] = [];
    const descriptions: string[] = [];
    for (const { item, def } of sectionItems) {
      rows.push(`| ${def.label} | ${formatDecimal(item.md_value)} MD | ${formatCurrencyMd(adjusted(item.price_value))} |`);
      if (def.description) descriptions.push(def.description);
    }

    const sectionTotal = sectionItems.reduce(
      (sum, { item }) => sum + adjusted(item.price_value),
      0,
    );
    stages.push({ label: sectionLabel, total: sectionTotal });

    sectionBlocks.push(
      [
        `### ${sectionLabel}`,
        ``,
        `| Položka | Rozsah | Cena |`,
        `|---------|--------|------|`,
        ...rows,
        `| **Celkem ${sectionLabel}** | | **${formatCurrencyMd(sectionTotal)}** |`,
        ...(descriptions.length > 0 ? [``, descriptions.join('\n\n')] : []),
      ].join('\n'),
    );
  }
  sections.push([`## Detailní rozsah projektu`, ``, sectionBlocks.join('\n\n')].join('\n'));

  // Celková cena
  sections.push(
    [
      `### Celková cena`,
      ``,
      `| | Cena |`,
      `|---|---|`,
      `| Mezisoučet | ${formatCurrencyMd(summary.adjustedSubtotal)} |`,
      `| Project management (${project.pm_percent} %) | ${formatCurrencyMd(summary.pmAmount)} |`,
      ...(summary.slaTotal > 0
        ? [
            `| Podpora po spuštění (${summary.months} měs. × ${formatCurrencyMd(summary.slaMonthlyFee)}) | ${formatCurrencyMd(summary.slaTotal)} |`,
          ]
        : []),
      `| **Celková cena projektu** (bez DPH) | **${formatCurrencyMd(summary.projectTotal)}** |`,
    ].join('\n'),
  );

  // PM se fakturuje měsíčně po dobu projektu. Měsíční částka se tiskne jen jako sazba
  // za prodloužení – nikdy jako součin, aby zaokrouhlení nerozbilo součet.
  const billingMonths = computeBillingMonths(project.start_date, project.end_date);
  const pmMonthly = billingMonths ? Math.round(summary.pmAmount / billingMonths) : null;
  const pmBillingLabel = billingMonths
    ? `měsíčně, ${billingMonths} ${pluralInvoices(billingMonths)}`
    : `měsíčně po dobu projektu`;

  // Přehled obrazovek (bez složitosti)
  if (screens.length > 0) {
    sections.push(`### Přehled obrazovek\n\n${buildScreensTable(screens)}`);
  }

  // Project management: co klient dostane (text z nastavení) + měsíční fakturace + prodloužení
  const pmBillingParagraph =
    billingMonths && pmMonthly
      ? `Řízení projektu (${formatCurrencyMd(summary.pmAmount)}) fakturujeme průběžně – ${billingMonths} ${pluralInvoices(billingMonths)}, za každý započatý měsíc projektu. Částka vychází z předpokládané doby trvání projektu. Pokud by se projekt prodloužil z důvodů na straně klienta, dovolíme si za každý další započatý měsíc účtovat ${formatCurrencyMd(pmMonthly)}; vždy vás na to upozorníme předem.`
      : `Řízení projektu (${formatCurrencyMd(summary.pmAmount)}) fakturujeme průběžně po měsících po dobu trvání projektu.`;
  sections.push(
    [`### Project management`, ``, settings.md_pm_text.trim(), ``, pmBillingParagraph].join('\n'),
  );

  // Podpora po spuštění (volitelná, jen pokud je nastavena)
  if (project.sla_monthly_fee > 0) {
    sections.push(
      [
        `### Podpora po spuštění`,
        ``,
        `Po spuštění se o web dál staráme za měsíční paušál **${formatCurrencyMd(project.sla_monthly_fee)}/měsíc** (v ceně je zahrnuto ${summary.months} měs.). Zahrnuje garantovanou dobu reakce, pravidelnou údržbu a prioritní řešení požadavků.`,
      ].join('\n'),
    );
  }

  // Platební podmínky (z nastavení) + fakturační milníky
  const milestoneRows = [
    ...stages.map(
      ({ label, total }) => `| ${label} | po schválení etapy | ${formatCurrencyMd(total)} |`,
    ),
    `| Project management | ${pmBillingLabel} | ${formatCurrencyMd(summary.pmAmount)} |`,
    ...(summary.slaTotal > 0
      ? [`| Podpora po spuštění | měsíčně po spuštění | ${formatCurrencyMd(summary.slaMonthlyFee)}/měs. |`]
      : []),
  ];
  sections.push(
    [
      `### Platební podmínky`,
      ``,
      settings.md_payment_terms.trim(),
      ``,
      `| Etapa | Fakturujeme | Částka |`,
      `|-------|-------------|--------|`,
      ...milestoneRows,
    ].join('\n'),
  );

  // Další informace
  sections.push(
    [
      `### Další informace`,
      ``,
      `- Všechny ceny jsou uvedeny bez DPH.`,
      `- Cenový odhad je platný 30 dní od data vystavení.`,
      ...(project.notes ? [``, `**Poznámky:** ${project.notes}`] : []),
    ].join('\n'),
  );

  // Další postup: výzva k akci + závěr (Markdown z nastavení, předává se beze změny)
  sections.push(`## Další postup\n\n${settings.md_next_steps.trim()}`);

  // Kontakty (z nastavení)
  sections.push(`## Na koho se v ŠG obracet\n\n${hardBreaks(settings.md_contacts)}`);

  // Dodavatel (z nastavení)
  sections.push(`### Dodavatel\n\n${hardBreaks(settings.md_supplier_info)}`);

  return sections.join('\n\n');
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
    { key: 'ux_primary_desktop', label: 'UX Desktop' },
    { key: 'ux_secondary_mobile', label: 'UX Mobil' },
    { key: 'ui_primary_desktop', label: 'UI Desktop' },
    { key: 'ui_secondary_mobile', label: 'UI Mobil' },
    { key: 'webflow', label: 'Webflow' },
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
