import { useState, useMemo, useEffect } from 'react';
import type {
  Project,
  ProjectScreen,
  ProjectBillableItem,
  BillableProductDefinition,
  GlobalSettings,
} from '../types';
import type { ProjectSummary } from '../lib/calculations';
import { generateMarkdown } from '../lib/markdown';
import { checkOffer, type CheckTab } from '../lib/checks';
import { offerMarkdownToHtml, offerHtmlDocument } from '../lib/offerHtml';
import { createGoogleDoc, loadGoogleIdentity, type CreatedDoc } from '../lib/gdocs';
import { formatCzechDate } from '../lib/formatting';

const TAB_NAMES: Record<CheckTab, string> = {
  kosilka: 'Košilka',
  screens: 'Obrazovky',
  billable: 'Položky',
};

interface Props {
  project: Project;
  screens: ProjectScreen[];
  billableItems: ProjectBillableItem[];
  definitions: BillableProductDefinition[];
  summary: ProjectSummary;
  settings: GlobalSettings;
  template: string;
  onNavigate: (tab: CheckTab) => void;
  userEmail: string;
}

export function MarkdownOutput({
  project,
  screens,
  billableItems,
  definitions,
  summary,
  settings,
  template,
  onNavigate,
  userEmail,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'preview' | 'markdown'>('preview');
  const [docState, setDocState] = useState<{ creating: boolean; error: string; doc: CreatedDoc | null }>({
    creating: false,
    error: '',
    doc: null,
  });

  // Knihovna Google se načte předem, aby se okno přihlášení otevřelo hned po kliknutí
  useEffect(() => {
    loadGoogleIdentity().catch(() => {});
  }, []);

  const markdown = useMemo(
    () =>
      generateMarkdown({
        project,
        screens,
        billableItems,
        definitions,
        summary,
        settings,
      }, template),
    [project, screens, billableItems, definitions, summary, settings, template],
  );

  const warnings = useMemo(
    () => checkOffer({ project, screens, billableItems, definitions, summary, settings }, markdown),
    [project, screens, billableItems, definitions, summary, settings, markdown],
  );

  const previewHtml = useMemo(() => offerMarkdownToHtml(markdown), [markdown]);

  // Každý export založí nový dokument, existující se nikdy nepřepisuje
  async function handleCreateDoc() {
    const name = `Nabídka – ${project.name || 'bez názvu'} – ${project.version_label} (${formatCzechDate(project.project_date)})`;
    setDocState({ creating: true, error: '', doc: null });
    try {
      const doc = await createGoogleDoc(offerHtmlDocument(markdown, name), name, userEmail);
      setDocState({ creating: false, error: '', doc });
      window.open(doc.url, '_blank', 'noopener');
    } catch (e) {
      setDocState({ creating: false, error: e instanceof Error ? e.message : String(e), doc: null });
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = markdown;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="markdown-tab">
      <div className="markdown-header">
        <h3>Nabídka</h3>
        <div className="markdown-actions">
          <div className="view-toggle">
            <button className={`btn btn-small${view === 'preview' ? ' btn-toggle-active' : ''}`} onClick={() => setView('preview')}>
              Náhled
            </button>
            <button className={`btn btn-small${view === 'markdown' ? ' btn-toggle-active' : ''}`} onClick={() => setView('markdown')}>
              Markdown
            </button>
          </div>
          <button onClick={handleCopy} className="btn" disabled={!template.trim()}>
            {copied ? 'Zkopírováno!' : 'Kopírovat Markdown'}
          </button>
          <button onClick={handleCreateDoc} className="btn btn-primary" disabled={!template.trim() || docState.creating}>
            {docState.creating ? 'Zakládám dokument…' : 'Založit Google Doc'}
          </button>
        </div>
      </div>
      {docState.doc && (
        <div className="doc-created">
          Dokument je založený ve vašem Google Disku:{' '}
          <a href={docState.doc.url} target="_blank" rel="noopener noreferrer">otevřít Google Doc</a>
        </div>
      )}
      {docState.error && <div className="doc-error">Google Doc se nepodařilo založit: {docState.error}</div>}
      {template.trim() && warnings.length > 0 && (
        <div className="offer-warnings">
          <strong>Před odesláním zkontrolujte:</strong>
          <ul>
            {warnings.map((w) => (
              <li key={w.message}>
                {w.message}{' '}
                <button className="link-btn" onClick={() => onNavigate(w.tab)}>
                  {TAB_NAMES[w.tab]} →
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!template.trim() ? (
        <div className="empty-state">
          Šablona nabídky není nahraná. Nahraje se z počítače příkazem <code>npm run sablona</code>.
        </div>
      ) : view === 'preview' ? (
        <div className="offer-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      ) : (
        <pre className="markdown-output">{markdown}</pre>
      )}
    </div>
  );
}
