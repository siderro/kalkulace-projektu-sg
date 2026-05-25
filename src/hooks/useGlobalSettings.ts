import { useState, useEffect, useCallback } from 'react';
import type { GlobalSettings, ScreenComplexityCalibration, BillableProductDefinition } from '../types';
import {
  fetchGlobalSettings,
  updateGlobalSettings as updateGlobalSettingsDb,
  fetchCalibration,
  updateCalibrationRow,
  fetchProductDefinitions,
  upsertProductDefinition,
  updateProductDefinition,
  deleteProductDefinition,
} from '../lib/db';

export interface GlobalSettingsState {
  settings: GlobalSettings | null;
  calibration: ScreenComplexityCalibration[];
  definitions: BillableProductDefinition[];
  loading: boolean;
  reload: () => Promise<void>;
  updateSettings: (s: Partial<GlobalSettings>) => Promise<void>;
  updateCalibration: (row: Partial<ScreenComplexityCalibration> & { id: string }) => Promise<void>;
  updateDefinition: (def: Partial<BillableProductDefinition> & { id: string }) => Promise<void>;
  createDefinition: (def: Omit<BillableProductDefinition, 'id'>) => Promise<BillableProductDefinition | null>;
  deleteDefinition: (id: string) => Promise<void>;
  reorderDefinition: (id: string, direction: 'up' | 'down') => Promise<void>;
}

export function useGlobalSettings(): GlobalSettingsState {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [calibration, setCalibration] = useState<ScreenComplexityCalibration[]>([]);
  const [definitions, setDefinitions] = useState<BillableProductDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [s, c, d] = await Promise.all([
      fetchGlobalSettings(),
      fetchCalibration(),
      fetchProductDefinitions(),
    ]);
    setSettings(s);
    setCalibration(c);
    setDefinitions(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateSettings = async (s: Partial<GlobalSettings>) => {
    if (!settings) return;
    const updated = await updateGlobalSettingsDb({ ...s, id: settings.id });
    if (updated) setSettings(updated);
  };

  const updateCalibration = async (row: Partial<ScreenComplexityCalibration> & { id: string }) => {
    await updateCalibrationRow(row);
    await reload();
  };

  const updateDefinition = async (def: Partial<BillableProductDefinition> & { id: string }) => {
    await updateProductDefinition(def);
    await reload();
  };

  const createDefinition = async (def: Omit<BillableProductDefinition, 'id'>): Promise<BillableProductDefinition | null> => {
    const result = await upsertProductDefinition(def as Partial<BillableProductDefinition>);
    await reload();
    return result;
  };

  const removeDefinition = async (id: string) => {
    await deleteProductDefinition(id);
    await reload();
  };

  const reorderDefinition = async (id: string, direction: 'up' | 'down') => {
    const item = definitions.find((d) => d.id === id);
    if (!item) return;

    // Find siblings in the same section, sorted
    const siblings = definitions
      .filter((d) => d.section_key === item.section_key)
      .sort((a, b) => a.sort_order - b.sort_order);

    const idx = siblings.findIndex((d) => d.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    const other = siblings[swapIdx];
    // Swap sort_orders
    await updateProductDefinition({ id: item.id, sort_order: other.sort_order });
    await updateProductDefinition({ id: other.id, sort_order: item.sort_order });
    await reload();
  };

  return {
    settings,
    calibration,
    definitions,
    loading,
    reload,
    updateSettings,
    updateCalibration,
    updateDefinition,
    createDefinition,
    deleteDefinition: removeDefinition,
    reorderDefinition,
  };
}
