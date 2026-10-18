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
import { formatCzechDate, formatCurrencyMd, formatDecimal, formatDuration } from './formatting';

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

  // Kontakty (z nastavení)
  sections.push(`## Na koho se v ŠG obracet\n\n${settings.md_contacts}`);

  // Shrnutí: výčet rozsahu, termíny, cena
  const firstScreenDerived = enabledDefs.findIndex(
    ({ def }) => def.calculation_type === 'derived_from_screens',
  );
  const scopeBullets = enabledDefs.map(({ def }, i) =>
    i === firstScreenDerived && screens.length > 0
      ? `- ${def.label} – scope stránek je definován v příloze`
      : `- ${def.label}`,
  );
  const termLines = [
    ...(project.start_date ? [`Začátek projektu: ${formatCzechDate(project.start_date)}`] : []),
    ...(project.end_date ? [`Konec projektu: ${formatCzechDate(project.end_date)}`] : []),
    ...(formatDuration(project.start_date, project.end_date)
      ? [`Celková doba: ${formatDuration(project.start_date, project.end_date)}`]
      : []),
  ];
  sections.push(
    [
      `## Shrnutí společného projektu`,
      ``,
      ...scopeBullets,
      ...(termLines.length > 0 ? [``, termLines.join('  \n')] : []),
      ``,
      `**Celková cena za projekt: ${formatCurrencyMd(summary.projectTotal)}** (bez DPH)`,
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
      `## Celková cena`,
      ``,
      `| | Cena |`,
      `|---|---|`,
      `| Mezisoučet | ${formatCurrencyMd(summary.adjustedSubtotal)} |`,
      `| Project management (${project.pm_percent} %) | ${formatCurrencyMd(summary.pmAmount)} |`,
      ...(summary.slaTotal > 0
        ? [
            `| SLA (${summary.months} měs. × ${formatCurrencyMd(summary.slaMonthlyFee)}) | ${formatCurrencyMd(summary.slaTotal)} |`,
          ]
        : []),
      `| **Celková cena projektu** (bez DPH) | **${formatCurrencyMd(summary.projectTotal)}** |`,
    ].join('\n'),
  );

  // Vysvětlení PM
  sections.push(
    [
      `## Project management`,
      ``,
      `Project management je kalkulován jako ${project.pm_percent} % z mezisoučtu. Zahrnuje řízení projektu, komunikaci s klientem, koordinaci týmu a průběžný reporting.`,
    ].join('\n'),
  );

  // Vysvětlení SLA
  if (project.sla_monthly_fee > 0) {
    sections.push(
      [
        `## SLA a průběžná podpora`,
        ``,
        `Měsíční paušál za SLA a průběžnou podporu: ${formatCurrencyMd(project.sla_monthly_fee)}/měsíc, po dobu ${summary.months} měs. po spuštění. SLA zahrnuje garantovanou dobu reakce, pravidelnou údržbu a prioritní řešení požadavků.`,
      ].join('\n'),
    );
  }

  // Další informace
  sections.push(
    [
      `## Další informace`,
      ``,
      `- Všechny ceny jsou uvedeny bez DPH.`,
      `- Cenový odhad je platný 30 dní od data vystavení.`,
      ...(project.notes ? [``, `**Poznámky:** ${project.notes}`] : []),
    ].join('\n'),
  );

  // Dodavatel (z nastavení)
  sections.push(`## Dodavatel\n\n${settings.md_supplier_info}`);

  // Příloha: přehled obrazovek (bez složitosti)
  if (screens.length > 0) {
    sections.push(`## Příloha: Přehled obrazovek\n\n${buildScreensTable(screens)}`);
  }

  return sections.join('\n\n');
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
