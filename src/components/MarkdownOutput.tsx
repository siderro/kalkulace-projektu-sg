import { useState, useMemo } from 'react';
import type {
  Project,
  ProjectScreen,
  ProjectBillableItem,
  BillableProductDefinition,
  GlobalSettings,
} from '../types';
import type { ProjectSummary } from '../lib/calculations';
import { generateMarkdown } from '../lib/markdown';

interface Props {
  project: Project;
  screens: ProjectScreen[];
  billableItems: ProjectBillableItem[];
  definitions: BillableProductDefinition[];
  summary: ProjectSummary;
  settings: GlobalSettings;
  template: string;
}

export function MarkdownOutput({
  project,
  screens,
  billableItems,
  definitions,
  summary,
  settings,
  template,
}: Props) {
  const [copied, setCopied] = useState(false);

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
        <h3>Vygenerovaný Markdown</h3>
        <button onClick={handleCopy} className="btn btn-primary">
          {copied ? 'Zkopírováno!' : 'Kopírovat do schránky'}
        </button>
      </div>
      {template.trim() ? (
        <pre className="markdown-output">{markdown}</pre>
      ) : (
        <div className="empty-state">
          Šablona nabídky není nahraná. Nahraje se z počítače příkazem <code>npm run sablona</code>.
        </div>
      )}
    </div>
  );
}
