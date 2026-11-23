// ============================================================
// Database CRUD operations for Supabase
// ============================================================

import { supabase } from './supabase';
import { nextVersionLabel, todayIso } from './formatting';
import type {
  GlobalSettings,
  ScreenComplexityCalibration,
  BillableProductDefinition,
  Project,
  ProjectScreen,
  ProjectBillableItem,
} from '../types';

// --- Šablona nabídky (nahrává ji `npm run sablona`, aplikace ji jen čte) ---

export async function fetchOfferTemplate(): Promise<string> {
  const { data, error } = await supabase
    .from('offer_templates')
    .select('content')
    .eq('key', 'nabidka')
    .maybeSingle();
  if (error) {
    console.error('fetchOfferTemplate:', error);
    return '';
  }
  return data?.content ?? '';
}

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
  if (error) throw new Error(`projects: ${error.message}`);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  // Delete child records first
  await supabase.from('project_billable_items').delete().eq('project_id', id);
  await supabase.from('project_screens').delete().eq('project_id', id);
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) console.error('deleteProject:', error);
}

// Kopie projektu: 'copy' = nový projekt podle vzoru, 'version' = další verze téže nabídky
export async function duplicateProject(
  projectId: string,
  mode: 'copy' | 'version' = 'copy',
): Promise<string | null> {
  const [project, screens, items] = await Promise.all([
    fetchProject(projectId),
    fetchProjectScreens(projectId),
    fetchProjectBillableItems(projectId),
  ]);
  if (!project) return null;

  const newProjectId = crypto.randomUUID();
  const now = new Date().toISOString();

  const newProject: Project = {
    ...project,
    id: newProjectId,
    ...(mode === 'version'
      ? { version_label: nextVersionLabel(project.version_label), project_date: todayIso() }
      : { name: `Kopie – ${project.name}` }),
    created_at: now,
    updated_at: now,
  };

  const newScreens: ProjectScreen[] = screens.map((s) => ({
    ...s,
    id: crypto.randomUUID(),
    project_id: newProjectId,
  }));

  const newItems: ProjectBillableItem[] = items.map((i) => ({
    ...i,
    id: crypto.randomUUID(),
    project_id: newProjectId,
  }));

  await upsertProject(newProject);
  if (newScreens.length > 0) {
    await saveProjectScreens(newProjectId, newScreens);
  }
  if (newItems.length > 0) {
    await saveProjectBillableItems(newProjectId, newItems);
  }

  return newProjectId;
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

// Uloží obrazovky projektu: nejdřív upsert, pak smazat odebrané (při chybě se nic neztratí).
// Při chybě vyhodí výjimku, aby se změny neoznačily jako uložené.
export async function saveProjectScreens(
  projectId: string,
  screens: ProjectScreen[],
): Promise<void> {
  await saveProjectRows('project_screens', projectId, screens);
}

async function saveProjectRows(
  table: 'project_screens' | 'project_billable_items',
  projectId: string,
  rows: { id: string }[],
): Promise<void> {
  if (rows.length > 0) {
    const { error } = await supabase.from(table).upsert(rows);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  let remove = supabase.from(table).delete().eq('project_id', projectId);
  if (rows.length > 0) remove = remove.not('id', 'in', `(${rows.map((r) => r.id).join(',')})`);
  const { error } = await remove;
  if (error) throw new Error(`${table}: ${error.message}`);
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
  await saveProjectRows('project_billable_items', projectId, items);
}
