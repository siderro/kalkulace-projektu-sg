import { useState, useCallback, useEffect } from 'react';
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

  function handleGoHome() {
    if (projectState.dirty) {
      if (!confirm('Máte neuložené změny. Opravdu chcete odejít?')) return;
    }
    setView('projects');
  }

  async function handleSave() {
    doRecalculate();
    await projectState.save();
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
              {' / '}{summary.months} měs.
            </span>
          )}
        </span>
        {projectState.dirty && <span className="dirty-indicator">Neuloženo</span>}
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
            onRemove={projectState.removeScreen}
          />
        )}

        {activeTab === 'billable' && (
          <BillableProducts
            project={project}
            items={billableItems}
            definitions={globals.definitions}
            summary={summary}
            onToggle={projectState.toggleItemEnabled}
            onDeselectAll={projectState.deselectAllItems}
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
          />
        )}
      </main>
    </div>
  );
}
