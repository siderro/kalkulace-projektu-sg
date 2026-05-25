import type { BillableProductDefinition, SectionKey } from '../types';
import { SECTION_LABELS } from '../types';

interface Props {
  definitions: BillableProductDefinition[];
  onEdit: (def: BillableProductDefinition) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
}

const SECTION_ORDER: SectionKey[] = [
  'pruzkum_a_pozice',
  'koncept',
  'vizualni_design',
  'programming',
];

function exportCatalogMd(definitions: BillableProductDefinition[]) {
  const lines: string[] = ['# Katalog fakturovatelných položek', ''];

  for (const sk of SECTION_ORDER) {
    const items = definitions
      .filter((d) => d.section_key === sk && d.active)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (items.length === 0) continue;

    lines.push(`## ${SECTION_LABELS[sk]}`, '');
    for (const item of items) {
      lines.push(`### ${item.label}`);
      if (item.description) {
        lines.push('', item.description);
      }
      lines.push('');
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'katalog-polozek.md';
  a.click();
  URL.revokeObjectURL(url);
}

export function CatalogList({ definitions, onEdit, onNew, onDelete, onReorder }: Props) {
  return (
    <div className="catalog-list">
      <div className="catalog-list-header">
        <h3>Katalog fakturovatelných položek</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportCatalogMd(definitions)} className="btn">Export MD</button>
          <button onClick={onNew} className="btn btn-primary">+ Nová položka</button>
        </div>
      </div>

      {SECTION_ORDER.map((sk) => {
        const sectionDefs = definitions
          .filter((d) => d.section_key === sk)
          .sort((a, b) => a.sort_order - b.sort_order);

        if (sectionDefs.length === 0) return null;

        return (
          <div key={sk} className="catalog-section">
            <h4>{SECTION_LABELS[sk]}</h4>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Pořadí</th>
                  <th>Položka</th>
                  <th>Typ</th>
                  <th>Stav</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sectionDefs.map((def, idx) => (
                  <tr
                    key={def.id}
                    className={!def.active ? 'row-disabled' : ''}
                  >
                    <td>
                      <div className="sort-arrows">
                        <button
                          className="btn btn-small"
                          disabled={idx === 0}
                          onClick={() => onReorder(def.id, 'up')}
                          title="Posunout nahoru"
                        >
                          ↑
                        </button>
                        <button
                          className="btn btn-small"
                          disabled={idx === sectionDefs.length - 1}
                          onClick={() => onReorder(def.id, 'down')}
                          title="Posunout dolů"
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        className="link-btn"
                        onClick={() => onEdit(def)}
                      >
                        {def.label}
                      </button>
                    </td>
                    <td>
                      {def.calculation_type === 'derived_from_screens'
                        ? 'z obrazovek'
                        : 'manuální'}
                    </td>
                    <td>
                      <span className={`source-badge ${def.active ? 'source-derived_from_screens' : 'source-manual_default'}`}>
                        {def.active ? 'aktivní' : 'neaktivní'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => {
                          if (confirm(`Smazat položku "${def.label}"?`)) {
                            onDelete(def.id);
                          }
                        }}
                      >
                        Smazat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
