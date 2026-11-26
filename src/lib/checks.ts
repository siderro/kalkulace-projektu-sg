// ============================================================
// Kontrola nabídky před odesláním — pure function, jen upozornění (nic neblokuje)
// ============================================================

import type { MarkdownInput } from './markdown';

export type CheckTab = 'kosilka' | 'screens' | 'billable';

export interface OfferWarning {
  message: string;
  tab: CheckTab;
}

export function checkOffer(input: MarkdownInput, markdown: string): OfferWarning[] {
  const { project, screens, billableItems, definitions } = input;
  const warnings: OfferWarning[] = [];
  const warn = (tab: CheckTab, message: string) => warnings.push({ tab, message });

  // Košilka
  if (!project.name.trim()) warn('kosilka', 'Chybí název projektu.');
  if (!project.client_name.trim()) warn('kosilka', 'Chybí klient.');
  else if (!project.client_contact.trim()) warn('kosilka', 'Chybí kontaktní osoba klienta.');
  if (!project.goal.trim()) warn('kosilka', 'Chybí cíl projektu.');
  if (!project.start_date || !project.end_date) {
    warn('kosilka', 'Chybí začátek nebo konec projektu – v nabídce nebudou termíny a řízení projektu se rozpočítá do etap.');
  } else if (project.end_date < project.start_date) {
    warn('kosilka', 'Konec projektu je před začátkem.');
  }

  // Obrazovky
  const unnamed = screens.filter((s) => !s.name.trim()).length;
  if (unnamed > 0) warn('screens', `${unnamed} ${plural(unnamed, 'obrazovka nemá', 'obrazovky nemají', 'obrazovek nemá')} název.`);
  const noFlag = screens.filter(
    (s) => !s.ux_primary_desktop && !s.ux_secondary_mobile && !s.ui_primary_desktop && !s.ui_secondary_mobile && !s.webflow,
  );
  if (noFlag.length > 0) {
    warn('screens', `Bez zaškrtnuté práce (nic nestojí): ${noFlag.map((s) => s.name.trim() || 'bez názvu').join(', ')}.`);
  }

  // Položky
  const defMap = new Map(definitions.map((d) => [d.id, d]));
  const enabled = billableItems.filter((i) => i.enabled && i.price_value > 0);
  if (enabled.length === 0) warn('billable', 'Nabídka nemá žádnou zaškrtnutou položku s cenou.');
  const noLabel = enabled.filter((i) => defMap.get(i.product_definition_id)?.custom && !i.custom_label.trim());
  if (noLabel.length > 0) warn('billable', 'Vlastní položka bez popisu – doplňte, co obsahuje.');
  const noDescription = enabled
    .map((i) => defMap.get(i.product_definition_id))
    .filter((d) => d && !d.custom && !d.description.trim())
    .map((d) => d!.label);
  if (noDescription.length > 0) {
    warn('billable', `Položky bez popisu pro klienta (popis se doplňuje v Nastavení → katalog): ${noDescription.join(', ')}.`);
  }

  // Šablona: neznámá značka zůstane ve výstupu jako {{x}}
  const unknownTags = [...new Set(markdown.match(/\{\{[#^/]?\w+\}\}/g) ?? [])];
  if (unknownTags.length > 0) {
    warn('kosilka', `Šablona obsahuje neznámé značky: ${unknownTags.join(', ')}.`);
  }

  return warnings;
}

// 1 obrazovka, 2–4 obrazovky, 5+ obrazovek
function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
