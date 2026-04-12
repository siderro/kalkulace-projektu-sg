import { useState, useCallback, useMemo } from 'react';
import type {
  Project,
  ProjectScreen,
  ProjectBillableItem,
  BillableProductDefinition,
  ScreenComplexityCalibration,
  GlobalSettings,
} from '../types';
import {
  fetchProject,
  fetchProjectScreens,
  fetchProjectBillableItems,
  upsertProject,
  saveProjectScreens,
  saveProjectBillableItems,
} from '../lib/db';
import { computeAllDerivedMdTotals, buildBillableItems, computeProjectSummary, computeItemPrice } from '../lib/calculations';
import type { ProjectSummary } from '../lib/calculations';
import { todayIso, computeExpectedStartDate } from '../lib/formatting';

export interface ProjectState {
  project: Project | null;
  screens: ProjectScreen[];
  billableItems: ProjectBillableItem[];
  summary: ProjectSummary | null;
  loading: boolean;
  dirty: boolean;
  mdRate: number;

  // Actions
  loadProject: (id: string) => Promise<void>;
  createNewProject: (
    name: string,
    settings: GlobalSettings,
    definitions: BillableProductDefinition[],
  ) => void;
  updateProjectField: (field: keyof Project, value: unknown) => void;

  // Screens
  setScreens: (screens: ProjectScreen[]) => void;
  addScreen: () => void;
  updateScreen: (id: string, field: keyof ProjectScreen, value: unknown) => void;
  removeScreen: (id: string) => void;

  // Billable items
  setBillableItems: (items: ProjectBillableItem[]) => void;
  toggleItemEnabled: (id: string) => void;
  deselectAllItems: () => void;
  overrideItemMd: (id: string, newMd: number) => void;
  resetItemOverride: (
    id: string,
    definitions: BillableProductDefinition[],
    calibration: ScreenComplexityCalibration[],
  ) => void;

  // Recalculate derived values from screens
  recalculate: (
    calibration: ScreenComplexityCalibration[],
    definitions: BillableProductDefinition[],
  ) => void;

  // Persistence
  save: () => Promise<void>;
}

export function useProject(): ProjectState {
  const [project, setProject] = useState<Project | null>(null);
  const [screens, setScreensState] = useState<ProjectScreen[]>([]);
  const [billableItems, setBillableItemsState] = useState<ProjectBillableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const mdRate = project ? project.hourly_rate * 8 : 0;

  // Summary is always derived — never stale
  const summary = useMemo<ProjectSummary | null>(() => {
    if (!project) return null;
    return computeProjectSummary(
      billableItems,
      project.complexity_coefficient_percent,
      project.pm_percent,
      project.sla_monthly_fee,
    );
  }, [project, billableItems]);

  const loadProject = useCallback(async (id: string) => {
    setLoading(true);
    const [p, s, b] = await Promise.all([
      fetchProject(id),
      fetchProjectScreens(id),
      fetchProjectBillableItems(id),
    ]);
    setProject(p);
    setScreensState(s);
    setBillableItemsState(b);
    setDirty(false);
    setLoading(false);
  }, []);

  const createNewProject = useCallback(
    (name: string, settings: GlobalSettings, definitions: BillableProductDefinition[]) => {
      const now = new Date().toISOString();
      const newMdRate = settings.default_hourly_rate * 8;
      const newProject: Project = {
        id: crypto.randomUUID(),
        name,
        project_code: '',
        version_label: 'v1',
        project_date: todayIso(),
        hourly_rate: settings.default_hourly_rate,
        complexity_coefficient_percent: 100,
        pm_percent: settings.default_pm_percent,
        first_mobile_set: settings.default_first_mobile_set,
        sla_monthly_fee: settings.default_sla_monthly_fee,
        days_to_start: settings.default_days_to_start,
        expected_start_date: computeExpectedStartDate(settings.default_days_to_start),
        notes: '',
        created_by: '',
        created_at: now,
        updated_at: now,
      };

      const items = buildBillableItems(
        definitions,
        [],
        { ux_primary_desktop: 0, ux_secondary_mobile: 0, ui_primary_desktop: 0, ui_secondary_mobile: 0, webflow: 0 },
        newProject.id,
        newMdRate,
      );

      setProject(newProject);
      setScreensState([]);
      setBillableItemsState(items);
      setDirty(true);
    },
    [],
  );

  const updateProjectField = useCallback((field: keyof Project, value: unknown) => {
    setProject((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      if (field === 'days_to_start') {
        updated.expected_start_date = computeExpectedStartDate(value as number);
      }
      return updated;
    });

    // When hourly rate changes, recalculate all item prices
    if (field === 'hourly_rate') {
      const newMdRate = (value as number) * 8;
      setBillableItemsState((prev) =>
        prev.map((item) => ({
          ...item,
          price_value: computeItemPrice(item.md_value, 'md_rate', newMdRate),
        })),
      );
    }

    setDirty(true);
  }, []);

  const setScreens = useCallback((newScreens: ProjectScreen[]) => {
    setScreensState(newScreens);
    setDirty(true);
  }, []);

  const addScreen = useCallback(() => {
    if (!project) return;
    const newScreen: ProjectScreen = {
      id: crypto.randomUUID(),
      project_id: project.id,
      name: '',
      complexity: 3,
      note: '',
      ux_primary_desktop: true,
      ux_secondary_mobile: false,
      ui_primary_desktop: true,
      ui_secondary_mobile: false,
      webflow: true,
      sort_order: screens.length,
    };
    setScreensState((prev) => [...prev, newScreen]);
    setDirty(true);
  }, [project, screens.length]);

  const updateScreen = useCallback(
    (id: string, field: keyof ProjectScreen, value: unknown) => {
      setScreensState((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
      );
      setDirty(true);
    },
    [],
  );

  const removeScreen = useCallback((id: string) => {
    setScreensState((prev) => prev.filter((s) => s.id !== id));
    setDirty(true);
  }, []);

  const setBillableItems = useCallback((items: ProjectBillableItem[]) => {
    setBillableItemsState(items);
    setDirty(true);
  }, []);

  const toggleItemEnabled = useCallback((id: string) => {
    setBillableItemsState((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    );
    setDirty(true);
  }, []);

  const deselectAllItems = useCallback(() => {
    setBillableItemsState((prev) =>
      prev.map((item) => ({ ...item, enabled: false })),
    );
    setDirty(true);
  }, []);

  const overrideItemMd = useCallback((id: string, newMd: number) => {
    const currentMdRate = (project?.hourly_rate ?? 0) * 8;
    setBillableItemsState((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              md_value: newMd,
              price_value: computeItemPrice(newMd, 'md_rate', currentMdRate),
              overridden: true,
              value_source: 'overridden_manual' as const,
            }
          : item,
      ),
    );
    setDirty(true);
  }, [project?.hourly_rate]);

  const resetItemOverride = useCallback(
    (
      id: string,
      definitions: BillableProductDefinition[],
      calibration: ScreenComplexityCalibration[],
    ) => {
      const currentMdRate = (project?.hourly_rate ?? 0) * 8;
      const derivedTotals = computeAllDerivedMdTotals(screens, calibration);
      const defMap = new Map(definitions.map((d) => [d.id, d]));

      setBillableItemsState((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const def = defMap.get(item.product_definition_id);
          if (!def) return item;

          let originalMd = def.default_md ?? 0;
          let valueSource: 'manual_default' | 'derived_from_screens' = 'manual_default';
          if (def.calculation_type === 'derived_from_screens' && def.source_key) {
            originalMd = derivedTotals[def.source_key] ?? 0;
            valueSource = 'derived_from_screens';
          }

          return {
            ...item,
            md_value: originalMd,
            price_value: computeItemPrice(originalMd, def.default_price_mode, currentMdRate),
            overridden: false,
            override_note: '',
            value_source: valueSource,
          };
        }),
      );
      setDirty(true);
    },
    [project?.hourly_rate, screens],
  );

  const recalculate = useCallback(
    (
      calibration: ScreenComplexityCalibration[],
      definitions: BillableProductDefinition[],
    ) => {
      if (!project) return;

      const derivedTotals = computeAllDerivedMdTotals(screens, calibration);
      const currentMdRate = project.hourly_rate * 8;

      const updatedItems = buildBillableItems(
        definitions,
        billableItems,
        derivedTotals,
        project.id,
        currentMdRate,
      );

      setBillableItemsState(updatedItems);
    },
    [project, screens, billableItems],
  );

  const save = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    await upsertProject(project);
    await saveProjectScreens(project.id, screens);
    await saveProjectBillableItems(project.id, billableItems);
    setDirty(false);
    setLoading(false);
  }, [project, screens, billableItems]);

  return {
    project,
    screens,
    billableItems,
    summary,
    loading,
    dirty,
    mdRate,
    loadProject,
    createNewProject,
    updateProjectField,
    setScreens,
    addScreen,
    updateScreen,
    removeScreen,
    setBillableItems,
    toggleItemEnabled,
    deselectAllItems,
    overrideItemMd,
    resetItemOverride,
    recalculate,
    save,
  };
}
