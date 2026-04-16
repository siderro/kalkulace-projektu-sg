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
import { type ProjectSummary } from './calculations';
import { formatCzechDate, formatCurrencyMd, formatDecimal } from './formatting';

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

  const enabledItems = billableItems.filter((item) => item.enabled);
  const enabledDefs = enabledItems.map((item) => ({
    item,
    def: defMap.get(item.product_definition_id)!,
  }));

  const sections: string[] = [];

  // 1. Header line with version and date
  sections.push(
    `**Verze ${project.version_label}** | ${formatCzechDate(project.project_date)}`,
  );

  // 2. Cost estimate heading
  sections.push(`# Cenový odhad`);

  // 3. Project name
  sections.push(`## ${project.name}`);

  // 4. Company information (from settings)
  sections.push(`### Dodavatel\n\n${settings.md_supplier_info}`);

  // 5. Contacts (from settings)
  sections.push(`### Kontakty\n\n${settings.md_contacts}`);

  // 6. Reference projects (from settings)
  sections.push(`### Reference\n\n${settings.md_references}`);

  // 7. Management summary — scope list from enabled items
  const scopeBlocks = enabledDefs.flatMap(({ def }) => [
    `#### ${def.label}`,
    ``,
    ...(def.description ? [def.description, ``] : []),
  ]);
  sections.push(
    [
      `### Rozsah projektu`,
      ``,
      `Cenový odhad zahrnuje:`,
      ``,
      ...scopeBlocks,
    ].join('\n').trimEnd(),
  );

  // 8. Scope summary
  if (screens.length > 0) {
    const screenNames = screens.map((s) => s.name).join(', ');
    sections.push(
      [
        `### Přehled obrazovek`,
        ``,
        `Projekt zahrnuje ${screens.length} obrazovek: ${screenNames}.`,
      ].join('\n'),
    );
  }

  // 9. Screens overview table
  if (screens.length > 0) {
    const screenTable = buildScreensTable(screens);
    sections.push(screenTable);
  }

  // 10. Billable products by section
  const sectionKeys: SectionKey[] = [
    'pruzkum_a_pozice',
    'koncept',
    'vizualni_design',
    'programming',
  ];

  for (const sectionKey of sectionKeys) {
    const sectionItems = enabledDefs.filter(
      ({ def }) => def.section_key === sectionKey,
    );
    if (sectionItems.length === 0) continue;

    const sectionLabel = SECTION_LABELS[sectionKey];
    const rows: string[] = [];
    for (const { item, def } of sectionItems) {
      rows.push(`| ${def.label} | ${formatDecimal(item.md_value)} MD | ${formatCurrencyMd(item.price_value)} |`);
      if (def.description) {
        rows.push('');
        rows.push(def.description);
        rows.push('');
      }
    }

    const sectionTotal = sectionItems.reduce(
      (sum, { item }) => sum + item.price_value,
      0,
    );

    sections.push(
      [
        `#### ${sectionLabel}`,
        ``,
        `| Položka | Rozsah | Cena |`,
        `|---------|--------|------|`,
        ...rows,
        `| **Celkem ${sectionLabel}** | | **${formatCurrencyMd(sectionTotal)}** |`,
      ].join('\n'),
    );
  }

  // 11. Summary
  sections.push(
    [
      `### Souhrn`,
      ``,
      `| | Hodnota |`,
      `|---|---|`,
      `| Mezisoučet fakturovatelných položek | ${formatCurrencyMd(summary.billableSubtotal)} |`,
      ...(project.complexity_coefficient_percent !== 100
        ? [
            `| Koeficient složitosti (${project.complexity_coefficient_percent} %) | ${formatCurrencyMd(summary.adjustedSubtotal)} |`,
          ]
        : []),
      `| Project management (${project.pm_percent} %) | ${formatCurrencyMd(summary.pmAmount)} |`,
      ...(summary.slaTotal > 0
        ? [
            `| SLA (${summary.months} měs. × ${formatCurrencyMd(summary.slaMonthlyFee)}) | ${formatCurrencyMd(summary.slaTotal)} |`,
          ]
        : []),
      `| **Celková cena projektu** | **${formatCurrencyMd(summary.projectTotal)}** |`,
    ].join('\n'),
  );

  // 12. PM explanation
  sections.push(
    [
      `### Project management`,
      ``,
      `Project management je kalkulován jako ${project.pm_percent} % z celkové ceny realizace.`,
      `Zahrnuje řízení projektu, komunikaci s klientem, koordinaci týmu a průběžný reporting.`,
    ].join('\n'),
  );

  // 13. SLA explanation
  if (project.sla_monthly_fee > 0) {
    sections.push(
      [
        `### SLA a průběžná podpora`,
        ``,
        `Měsíční paušál za SLA a průběžnou podporu: **${formatCurrencyMd(project.sla_monthly_fee)}/měsíc**.`,
        `SLA zahrnuje garantovanou dobu reakce, pravidelnou údržbu a prioritní řešení požadavků.`,
      ].join('\n'),
    );
  }

  // 14. Additional info
  sections.push(
    [
      `### Další informace`,
      ``,
      `- Všechny ceny jsou uvedeny bez DPH.`,
      `- Cenový odhad je platný 30 dní od data vystavení.`,
      ...(project.days_to_start > 0
        ? [
            `- Předpokládaný začátek projektu: ${formatCzechDate(project.expected_start_date)}.`,
          ]
        : []),
      ...(project.notes ? [``, `**Poznámky:** ${project.notes}`] : []),
    ].join('\n'),
  );

  return sections.join('\n\n---\n\n');
}

// --- Screens table helper ---

function buildScreensTable(screens: ProjectScreen[]): string {
  const flagLabels: { key: keyof ProjectScreen; label: string }[] = [
    { key: 'ux_primary_desktop', label: 'UX Desktop' },
    { key: 'ux_secondary_mobile', label: 'UX Mobil' },
    { key: 'ui_primary_desktop', label: 'UI Desktop' },
    { key: 'ui_secondary_mobile', label: 'UI Mobil' },
    { key: 'webflow', label: 'Webflow' },
  ];

  const header = `| # | Obrazovka | Složitost | ${flagLabels.map((f) => f.label).join(' | ')} |`;
  const separator = `|---|-----------|-----------|${flagLabels.map(() => '---').join('|')}|`;

  const rows = screens.map((s, i) => {
    const flags = flagLabels
      .map((f) => (s[f.key] ? '✓' : '–'))
      .join(' | ');
    return `| ${i + 1} | ${s.name} | ${s.complexity} | ${flags} |`;
  });

  return [header, separator, ...rows].join('\n');
}
