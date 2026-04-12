// ============================================================
// Database CRUD operations for Supabase
// ============================================================

import { supabase } from './supabase';
import type {
  GlobalSettings,
  ScreenComplexityCalibration,
  BillableProductDefinition,
  Project,
  ProjectScreen,
  ProjectBillableItem,
} from '../types';

// --- Global Settings ---

export async function fetchGlobalSettings(): Promise<GlobalSettings | null> {
  const { data, error } = await supabase
    .from('global_settings')
    .select('*')
    .limit(1)
    .single();
  if (error) {
    console.error('fetchGlobalSettings:', error);
    return null;
  }
  return data;
}

export async function updateGlobalSettings(
  settings: Partial<GlobalSettings>,
): Promise<GlobalSettings | null> {
  const { data, error } = await supabase
    .from('global_settings')
    .update(settings)
    .eq('id', settings.id!)
    .select()
    .single();
  if (error) {
    console.error('updateGlobalSettings:', error);
    return null;
  }
  return data;
}

// --- Screen Complexity Calibration ---

export async function fetchCalibration(): Promise<ScreenComplexityCalibration[]> {
  const { data, error } = await supabase
    .from('screen_complexity_calibration')
    .select('*')
    .order('sort_order');
  if (error) {
    console.error('fetchCalibration:', error);
    return [];
  }
  return data ?? [];
}

export async function updateCalibrationRow(
  row: Partial<ScreenComplexityCalibration> & { id: string },
): Promise<void> {
  const { error } = await supabase
    .from('screen_complexity_calibration')
    .update(row)
    .eq('id', row.id);
  if (error) console.error('updateCalibrationRow:', error);
}

// --- Billable Product Definitions ---

export async function fetchProductDefinitions(): Promise<BillableProductDefinition[]> {
  const { data, error } = await supabase
    .from('billable_product_definitions')
    .select('*')
    .order('sort_order');
  if (error) {
    console.error('fetchProductDefinitions:', error);
    return [];
  }
  return data ?? [];
}

export async function upsertProductDefinition(
  def: Partial<BillableProductDefinition>,
): Promise<BillableProductDefinition | null> {
  const { data, error } = await supabase
    .from('billable_product_definitions')
    .upsert(def)
    .select()
    .single();
  if (error) {
    console.error('upsertProductDefinition:', error);
    return null;
  }
  return data;
}

export async function updateProductDefinition(
  def: Partial<BillableProductDefinition> & { id: string },
): Promise<void> {
  const { id, ...rest } = def;
  const { error } = await supabase
    .from('billable_product_definitions')
    .update(rest)
    .eq('id', id);
  if (error) console.error('updateProductDefinition:', error);
}

export async function deleteProductDefinition(id: string): Promise<void> {
  const { error } = await supabase
    .from('billable_product_definitions')
    .delete()
    .eq('id', id);
  if (error) console.error('deleteProductDefinition:', error);
}

// --- Projects ---

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('fetchProjects:', error);
    return [];
  }
  return data ?? [];
}

export async function fetchProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('fetchProject:', error);
    return null;
  }
  return data;
}

export async function upsertProject(
  project: Partial<Project>,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .upsert({
      ...project,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error('upsertProject:', error);
    return null;
  }
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  // Delete child records first
  await supabase.from('project_billable_items').delete().eq('project_id', id);
  await supabase.from('project_screens').delete().eq('project_id', id);
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) console.error('deleteProject:', error);
}

// --- Project Screens ---

export async function fetchProjectScreens(
  projectId: string,
): Promise<ProjectScreen[]> {
  const { data, error } = await supabase
    .from('project_screens')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order');
  if (error) {
    console.error('fetchProjectScreens:', error);
    return [];
  }
  return data ?? [];
}

export async function saveProjectScreens(
  projectId: string,
  screens: ProjectScreen[],
): Promise<void> {
  // Delete existing, then insert all (simplest approach for current state)
  await supabase.from('project_screens').delete().eq('project_id', projectId);
  if (screens.length > 0) {
    const { error } = await supabase.from('project_screens').insert(screens);
    if (error) console.error('saveProjectScreens:', error);
  }
}

// --- Project Billable Items ---

export async function fetchProjectBillableItems(
  projectId: string,
): Promise<ProjectBillableItem[]> {
  const { data, error } = await supabase
    .from('project_billable_items')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order');
  if (error) {
    console.error('fetchProjectBillableItems:', error);
    return [];
  }
  return data ?? [];
}

export async function saveProjectBillableItems(
  projectId: string,
  items: ProjectBillableItem[],
): Promise<void> {
  await supabase
    .from('project_billable_items')
    .delete()
    .eq('project_id', projectId);
  if (items.length > 0) {
    const { error } = await supabase
      .from('project_billable_items')
      .insert(items);
    if (error) console.error('saveProjectBillableItems:', error);
  }
}
