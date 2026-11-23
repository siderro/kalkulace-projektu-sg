import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useGlobalSettings } from './hooks/useGlobalSettings';
import { useProject } from './hooks/useProject';
import { AuthGate } from './components/Auth';
import { ProjectList } from './components/ProjectList';
import { Kosilka } from './components/Kosilka';
import { Screens } from './components/Screens';
import { BillableProducts } from './components/BillableProducts';
import { MarkdownOutput } from './components/MarkdownOutput';
import { GlobalSettingsPanel } from './components/GlobalSettings';
import { formatCurrency, formatDecimal } from './lib/formatting';

type Tab = 'kosilka' | 'screens' | 'billable' | 'output';
type View = 'projects' | 'editor' | 'settings';

// Automatické uložení po chvíli bez změn
const AUTOSAVE_DELAY_MS = 2000;

interface Undo {
  message: string;
  restore: () => void;
}

const TAB_LABELS: Record<Tab, string> = {
  kosilka: 'Košilka',
  screens: 'Obrazovky',
  billable: 'Fakturovatelné položky',
  output: 'Markdown výstup',
};

export default function App() {
  const auth = useAuth();
  const globals = useGlobalSettings();
  const projectState = useProject();

  const [view, setView] = useState<View>('projects');
  const [activeTab, setActiveTab] = useState<Tab>('kosilka');
  const [undo, setUndo] = useState<Undo | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recalculate when switching to billable or output tabs
  const doRecalculate = useCallback(() => {
    if (projectState.project && globals.calibration.length > 0 && globals.definitions.length > 0) {
      projectState.recalculate(globals.calibration, globals.definitions);
    }
  }, [projectState.project, globals.calibration, globals.definitions, projectState.recalculate]);

  // Recalculate instantly when screens change (checkboxes, add, remove)
  useEffect(() => {
    doRecalculate();
  }, [projectState.screens]);

  function handleTabChange(tab: Tab) {
    if (tab === 'billable' || tab === 'output') {
      doRecalculate();
    }
    setActiveTab(tab);
  }

  function handleOpenProject(id: string) {
    projectState.loadProject(id).then(() => {
      setView('editor');
      setActiveTab('kosilka');
    });
  }

  function handleNewProject() {
    if (!globals.settings) return;
    projectState.createNewProject('', globals.settings, globals.definitions);
    setView('editor');
    setActiveTab('kosilka');
  }

  async function handleGoHome() {
    // Projekt s názvem se před odchodem uloží, nepojmenovaný se jen potvrdí
    if (projectState.dirty && projectState.project?.name.trim()) {
      if (!(await projectState.save())) return;
    } else if (projectState.dirty) {
      if (!confirm('Projekt nemá název a nebude uložen. Opravdu chcete odejít?')) return;
    }
    setView('projects');
  }

  async function handleSave() {
    doRecalculate();
    await projectState.save();
  }

  // Autosave: projekt s názvem se uloží 2 s po poslední změně (prázdný nový projekt ne)
  const { dirty, loading: saving, save, project: currentProject } = projectState;
  useEffect(() => {
    if (view !== 'editor' || !dirty || saving || !currentProject?.name.trim()) return;
    const timer = setTimeout(() => { save(); }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [view, dirty, saving, save, currentProject]);

  // Varování při zavření tabu s neuloženými změnami
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Cmd/Ctrl+S = uložit
  useEffect(() => {
    if (view !== 'editor') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, save]);

  // Krátká nabídka „Vrátit“ po mazání
  function offerUndo(message: string, restore: () => void) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ message, restore });
    undoTimer.current = setTimeout(() => setUndo(null), 8000);
  }

  function handleRemoveScreen(id: string) {
    const before = projectState.screens;
    const name = before.find((s) => s.id === id)?.name.trim();
    projectState.removeScreen(id);
    offerUndo(name ? `Obrazovka „${name}“ smazána.` : 'Obrazovka smazána.', () => projectState.setScreens(before));
  }

  function handleDeselectAll() {
    const before = projectState.billableItems;
    projectState.deselectAllItems();
    offerUndo('Všechny položky odznačeny.', () => projectState.setBillableItems(before));
  }

  // --- Auth gate ---
  if (!auth.user) {
    return <AuthGate auth={auth} />;
  }

  // --- Loading global settings ---
  if (globals.loading) {
    return <div className="loading">Načítání globálních nastavení...</div>;
  }

  if (!globals.settings) {
    return (
      <div className="error-screen">
        <p>Nepodařilo se načíst globální nastavení.</p>
        <p>Zkontrolujte, zda jsou tabulky v Supabase správně vytvořeny.</p>
        <button onClick={globals.reload} className="btn">Zkusit znovu</button>
      </div>
    );
  }

  // --- Global settings view ---
  if (view === 'settings') {
    return (
      <div className="app">
        <header className="app-header">
          <a className="app-logo" onClick={handleGoHome}><span className="app-logo-emoji">💰</span> Kalkulace SG</a>
          <span className="user-info">{auth.user.email}</span>
          <button onClick={auth.signOut} className="btn btn-small">Odhlásit</button>
        </header>
        <main className="app-main">
          <GlobalSettingsPanel
            settings={globals.settings}
            calibration={globals.calibration}
            definitions={globals.definitions}
            onUpdateSettings={globals.updateSettings}
            onUpdateCalibration={globals.updateCalibration}
            onUpdateDefinition={globals.updateDefinition}
            onCreateDefinition={globals.createDefinition}
            onDeleteDefinition={globals.deleteDefinition}
            onReorderDefinition={globals.reorderDefinition}
            onClose={() => setView('projects')}
          />
        </main>
      </div>
    );
  }

  // --- Project list view ---
  if (view === 'projects') {
    return (
      <div className="app">
        <header className="app-header">
          <a className="app-logo" onClick={handleGoHome}><span className="app-logo-emoji">💰</span> Kalkulace SG</a>
          <span className="user-info">{auth.user.email}</span>
          <button onClick={() => setView('settings')} className="btn btn-small">
            Nastavení
          </button>
          <button onClick={auth.signOut} className="btn btn-small">Odhlásit</button>
        </header>
        <main className="app-main">
          <ProjectList
            onOpen={handleOpenProject}
            onNew={handleNewProject}
          />
        </main>
      </div>
    );
  }

  // --- Project editor view ---
  const { project, screens, billableItems, summary } = projectState;

  if (!project) {
    return <div className="loading">Načítání projektu...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <a className="app-logo" onClick={handleGoHome}><span className="app-logo-emoji">💰</span> Kalkulace SG</a>
        <span className="app-title">
          {project.name || 'Bez názvu'}
          {summary && (
            <span className="app-title-meta">
              {' '}{formatCurrency(summary.projectTotal)}
              {' / '}{formatDecimal(summary.totalMd, 1)} MD
            </span>
          )}
        </span>
        {projectState.saveError ? (
          <span className="dirty-indicator save-error" title={projectState.saveError}>Uložení selhalo</span>
        ) : projectState.dirty ? (
          <span className="dirty-indicator">{project.name.trim() ? 'Neuloženo' : 'Neuloženo (vyplňte název)'}</span>
        ) : projectState.lastSavedAt ? (
          <span className="saved-indicator">
            Uloženo {projectState.lastSavedAt.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : null}
        <button
          onClick={handleSave}
          className="btn btn-primary btn-small"
          disabled={projectState.loading}
        >
          {projectState.loading ? 'Ukládání...' : 'Uložit'}
        </button>
        <span className="user-info">{auth.user.email}</span>
        <button onClick={auth.signOut} className="btn btn-small">Odhlásit</button>
      </header>

      <nav className="tabs">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {TAB_LABELS[tab]}{tab === 'screens' && screens.length > 0 ? ` (${screens.length})` : ''}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === 'kosilka' && (
          <Kosilka
            project={project}
            settings={globals.settings}
            mdRate={projectState.mdRate}
            onUpdate={projectState.updateProjectField}
          />
        )}

        {activeTab === 'screens' && (
          <Screens
            screens={screens}
            calibration={globals.calibration}
            onAdd={projectState.addScreen}
            onUpdate={projectState.updateScreen}
            onDuplicate={projectState.duplicateScreen}
            onRemove={handleRemoveScreen}
          />
        )}

        {activeTab === 'billable' && (
          <BillableProducts
            project={project}
            items={billableItems}
            definitions={globals.definitions}
            summary={summary}
            onToggle={projectState.toggleItemEnabled}
            onDeselectAll={handleDeselectAll}
            onOverrideMd={projectState.overrideItemMd}
            onResetOverride={(id) => projectState.resetItemOverride(id, globals.definitions, globals.calibration)}
          />
        )}

        {activeTab === 'output' && summary && (
          <MarkdownOutput
            project={project}
            screens={screens}
            billableItems={billableItems}
            definitions={globals.definitions}
            summary={summary}
            settings={globals.settings}
            template={globals.template}
            onNavigate={(tab) => handleTabChange(tab)}
          />
        )}
      </main>

      {undo && (
        <div className="undo-toast">
          {undo.message}
          <button
            className="btn btn-small"
            onClick={() => {
              undo.restore();
              setUndo(null);
            }}
          >
            Vrátit
          </button>
        </div>
      )}
    </div>
  );
}
