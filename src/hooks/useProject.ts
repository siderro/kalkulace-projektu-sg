import { useState, useCallback, useMemo, useRef } from 'react';
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
import { todayIso } from '../lib/formatting';

export interface ProjectState {
  project: Project | null;
  screens: ProjectScreen[];
  billableItems: ProjectBillableItem[];
  summary: ProjectSummary | null;
  loading: boolean;
  dirty: boolean;
  saveError: string | null;
  lastSavedAt: Date | null;
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
  addScreens: (names: string[]) => void;
  setFlagForAllScreens: (field: keyof ProjectScreen, value: boolean) => void;
  updateScreen: (id: string, field: keyof ProjectScreen, value: unknown) => void;
  duplicateScreen: (id: string) => void;
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
  save: () => Promise<boolean>; // false = uložení selhalo
}

export function useProject(): ProjectState {
  const [project, setProject] = useState<Project | null>(null);
  const [screens, setScreensState] = useState<ProjectScreen[]>([]);
  const [billableItems, setBillableItemsState] = useState<ProjectBillableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // Počítadlo změn: uložení označí projekt jako uložený jen když se mezitím nic nezměnilo
  const changeCount = useRef(0);
  const markDirty = useCallback(() => {
    changeCount.current += 1;
    setDirty(true);
  }, []);

  const mdRate = project ? project.hourly_rate * 8 : 0;

  // Summary is always derived — never stale
  const summary = useMemo<ProjectSummary | null>(() => {
    if (!project) return null;
    return computeProjectSummary(
      billableItems,
      project.complexity_coefficient_percent,
      project.pm_percent,
      project.sla_monthly_fee,
      project.sla_months,
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
    setSaveError(null);
    setLastSavedAt(null);
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
        sla_months: 1,
        start_date: null,
        end_date: null,
        goal: '',
        client_name: '',
        client_contact: '',
        client_ico: '',
        client_address: '',
        client_dic: '',
        references_disabled: false,
        offer_total: 0,
        exclusions_extra: settings.md_exclusions,
        references_override: settings.md_references,
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
      markDirty();
    },
    [markDirty],
  );

  const updateProjectField = useCallback((field: keyof Project, value: unknown) => {
    setProject((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
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

    markDirty();
  }, [markDirty]);

  const setScreens = useCallback((newScreens: ProjectScreen[]) => {
    setScreensState(newScreens);
    markDirty();
  }, [markDirty]);

  // Nové obrazovky přebírají složitost a zaškrtnutou práci z poslední obrazovky
  const addScreens = useCallback((names: string[]) => {
    if (!project) return;
    setScreensState((prev) => {
      const last = prev[prev.length - 1];
      const added = names.map((name, i): ProjectScreen => ({
        id: crypto.randomUUID(),
        project_id: project.id,
        name,
        complexity: last?.complexity ?? 3,
        note: '',
        ux_primary_desktop: last?.ux_primary_desktop ?? false,
        ux_secondary_mobile: last?.ux_secondary_mobile ?? false,
        ui_primary_desktop: last?.ui_primary_desktop ?? false,
        ui_secondary_mobile: last?.ui_secondary_mobile ?? false,
        webflow: last?.webflow ?? false,
        sort_order: prev.length + i,
      }));
      return [...prev, ...added];
    });
    markDirty();
  }, [project, markDirty]);

  const addScreen = useCallback(() => addScreens(['']), [addScreens]);

  const setFlagForAllScreens = useCallback((field: keyof ProjectScreen, value: boolean) => {
    setScreensState((prev) => prev.map((s) => ({ ...s, [field]: value })));
    markDirty();
  }, [markDirty]);

  const updateScreen = useCallback(
    (id: string, field: keyof ProjectScreen, value: unknown) => {
      setScreensState((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
      );
      markDirty();
    },
    [markDirty],
  );

  const duplicateScreen = useCallback((id: string) => {
    setScreensState((prev) => {
      const source = prev.find((s) => s.id === id);
      if (!source) return prev;
      const copy: ProjectScreen = {
        ...source,
        id: crypto.randomUUID(),
        name: `Kopie – ${source.name}`,
        sort_order: prev.length,
      };
      return [...prev, copy];
    });
    markDirty();
  }, [markDirty]);

  const removeScreen = useCallback((id: string) => {
    setScreensState((prev) => prev.filter((s) => s.id !== id));
    markDirty();
  }, [markDirty]);

  const setBillableItems = useCallback((items: ProjectBillableItem[]) => {
    setBillableItemsState(items);
    markDirty();
  }, [markDirty]);

  const toggleItemEnabled = useCallback((id: string) => {
    setBillableItemsState((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    );
    markDirty();
  }, [markDirty]);

  const deselectAllItems = useCallback(() => {
    setBillableItemsState((prev) =>
      prev.map((item) => ({ ...item, enabled: false })),
    );
    markDirty();
  }, [markDirty]);

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
    markDirty();
  }, [project?.hourly_rate, markDirty]);

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
      markDirty();
    },
    [project?.hourly_rate, screens, markDirty],
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
    if (!project) return false;
    const savedChange = changeCount.current;
    setLoading(true);
    try {
      // Celková cena se ukládá kvůli seznamu projektů
      await upsertProject({ ...project, offer_total: summary?.projectTotal ?? 0 });
      await saveProjectScreens(project.id, screens);
      await saveProjectBillableItems(project.id, billableItems);
      setSaveError(null);
      setLastSavedAt(new Date());
      if (changeCount.current === savedChange) setDirty(false);
      setLoading(false);
      return true;
    } catch (e) {
      console.error('save:', e);
      setSaveError(e instanceof Error ? e.message : String(e));
      setLoading(false);
      return false;
    }
  }, [project, screens, billableItems, summary]);

  return {
    project,
    screens,
    billableItems,
    summary,
    loading,
    dirty,
    saveError,
    lastSavedAt,
    mdRate,
    loadProject,
    createNewProject,
    updateProjectField,
    setScreens,
    addScreen,
    addScreens,
    setFlagForAllScreens,
    updateScreen,
    duplicateScreen,
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
