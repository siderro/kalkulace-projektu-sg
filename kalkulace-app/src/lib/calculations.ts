// ============================================================
// Pure calculation functions — no UI, no side effects
// ============================================================

import {
  COMPLEXITY_PERCENTAGES,
  type ProjectScreen,
  type ScreenComplexityCalibration,
  type WorkTypeKey,
  type BillableProductDefinition,
  type ProjectBillableItem,
} from '../types';

// --- Screen flag → work type key mapping ---

const SCREEN_FLAG_TO_WORK_TYPE: Record<string, WorkTypeKey> = {
  ux_primary_desktop: 'ux_primary_desktop',
  ux_secondary_mobile: 'ux_secondary_mobile',
  ui_primary_desktop: 'ui_primary_desktop',
  ui_secondary_mobile: 'ui_secondary_mobile',
  webflow: 'webflow',
};

// --- Per-screen MD for a given work type ---

export function computeScreenMd(
  complexity: number,
  baseMdAtLevel5: number,
): number {
  const pct = COMPLEXITY_PERCENTAGES[complexity] ?? 0;
  return baseMdAtLevel5 * pct;
}

// --- Sum MD across all screens for one work type ---

export function sumScreensMdForWorkType(
  screens: ProjectScreen[],
  workTypeKey: WorkTypeKey,
  calibration: ScreenComplexityCalibration[],
): number {
  const cal = calibration.find((c) => c.work_type_key === workTypeKey);
  if (!cal) return 0;

  // The flag on the screen that enables this work type
  const flagKey = workTypeKey as keyof ProjectScreen;

  let total = 0;
  for (const screen of screens) {
    if (screen[flagKey]) {
      total += computeScreenMd(screen.complexity, cal.base_md_at_level_5);
    }
  }
  return total;
}

// --- Compute all derived MD totals from screens ---

export function computeAllDerivedMdTotals(
  screens: ProjectScreen[],
  calibration: ScreenComplexityCalibration[],
): Record<WorkTypeKey, number> {
  const result: Record<WorkTypeKey, number> = {
    ux_primary_desktop: 0,
    ux_secondary_mobile: 0,
    ui_primary_desktop: 0,
    ui_secondary_mobile: 0,
    webflow: 0,
  };
  for (const key of Object.keys(SCREEN_FLAG_TO_WORK_TYPE) as WorkTypeKey[]) {
    result[key] = sumScreensMdForWorkType(screens, key, calibration);
  }
  return result;
}

// --- Build project billable items from definitions + derived values ---

export function buildBillableItems(
  definitions: BillableProductDefinition[],
  existingItems: ProjectBillableItem[],
  derivedMdTotals: Record<WorkTypeKey, number>,
  projectId: string,
  mdRate: number,
): ProjectBillableItem[] {
  const existingByDefId = new Map(
    existingItems.map((item) => [item.product_definition_id, item]),
  );

  return definitions
    .filter((def) => def.active)
    .map((def) => {
      const existing = existingByDefId.get(def.id);

      // Determine base MD value
      let baseMd = def.default_md ?? 0;
      let valueSource: ProjectBillableItem['value_source'] = 'manual_default';

      if (def.calculation_type === 'derived_from_screens' && def.source_key) {
        baseMd = derivedMdTotals[def.source_key] ?? 0;
        valueSource = 'derived_from_screens';
      }

      // If existing item exists and is overridden, keep the override
      if (existing && existing.overridden) {
        return {
          ...existing,
          price_value: computeItemPrice(existing.md_value, def.default_price_mode, mdRate),
        };
      }

      // Compute price from MD
      const mdValue = existing && existing.overridden ? existing.md_value : baseMd;
      const priceValue = computeItemPrice(mdValue, def.default_price_mode, mdRate);

      return {
        id: existing?.id ?? crypto.randomUUID(),
        project_id: projectId,
        product_definition_id: def.id,
        enabled: existing?.enabled ?? (def.calculation_type === 'derived_from_screens'),
        md_value: mdValue,
        price_value: priceValue,
        value_source: existing?.overridden ? 'overridden_manual' : valueSource,
        overridden: existing?.overridden ?? false,
        override_note: existing?.override_note ?? '',
        sort_order: def.sort_order,
      };
    });
}

// --- Price from MD based on price mode ---

// MD rate = hourly_rate * 8. All items price via mdRate.
export function computeItemPrice(
  md: number,
  priceMode: string,
  mdRate: number,
): number {
  switch (priceMode) {
    case 'md_rate':
      return md * mdRate;
    case 'hourly_rate':
      return md * mdRate; // MD rate already is hourly * 8
    case 'fixed':
      return md; // md_value IS the price for fixed items
    default:
      return md * mdRate;
  }
}

// --- Billable subtotal (sum of enabled items' prices) ---

export function computeBillableSubtotal(
  items: ProjectBillableItem[],
): number {
  return items
    .filter((item) => item.enabled)
    .reduce((sum, item) => sum + item.price_value, 0);
}

// --- Adjusted subtotal (after complexity coefficient) ---

export function computeAdjustedSubtotal(
  billableSubtotal: number,
  complexityCoefficientPercent: number,
): number {
  return billableSubtotal * (complexityCoefficientPercent / 100);
}

// --- PM amount ---

export function computePmAmount(
  adjustedSubtotal: number,
  pmPercent: number,
): number {
  return adjustedSubtotal * (pmPercent / 100);
}

// --- Total (adjusted subtotal + PM + SLA is separate) ---

export function computeProjectTotal(
  adjustedSubtotal: number,
  pmAmount: number,
): number {
  return adjustedSubtotal + pmAmount;
}

// --- Full project summary calculation ---

export interface ProjectSummary {
  billableSubtotal: number;
  adjustedSubtotal: number;
  pmAmount: number;
  totalMd: number;
  months: number;
  slaMonthlyFee: number;
  slaTotal: number;
  projectTotal: number;
}

export function computeProjectSummary(
  items: ProjectBillableItem[],
  complexityCoefficientPercent: number,
  pmPercent: number,
  slaMonthlyFee: number,
): ProjectSummary {
  const billableSubtotal = computeBillableSubtotal(items);
  const adjustedSubtotal = computeAdjustedSubtotal(
    billableSubtotal,
    complexityCoefficientPercent,
  );
  const pmAmount = computePmAmount(adjustedSubtotal, pmPercent);
  const totalMd = items
    .filter((item) => item.enabled)
    .reduce((sum, item) => sum + item.md_value, 0);
  const months = totalMd > 0 ? Math.max(1, Math.ceil(totalMd / 20)) : 0;
  const slaTotal = months * slaMonthlyFee;
  const projectTotal = computeProjectTotal(adjustedSubtotal, pmAmount) + slaTotal;

  return {
    billableSubtotal,
    adjustedSubtotal,
    pmAmount,
    totalMd,
    months,
    slaMonthlyFee,
    slaTotal,
    projectTotal,
  };
}
