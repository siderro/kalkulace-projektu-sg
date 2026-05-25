import { useState } from 'react';
import type {
  ProjectBillableItem,
  BillableProductDefinition,
  SectionKey,
  Project,
} from '../types';
import { SECTION_LABELS } from '../types';
import { formatDecimal, formatCurrency } from '../lib/formatting';
import type { ProjectSummary } from '../lib/calculations';

interface Props {
  project: Project;
  items: ProjectBillableItem[];
  definitions: BillableProductDefinition[];
  summary: ProjectSummary | null;
  onToggle: (id: string) => void;
  onDeselectAll: () => void;
  onOverrideMd: (id: string, newMd: number) => void;
  onResetOverride: (id: string) => void;
}

const SECTION_ORDER: SectionKey[] = [
  'pruzkum_a_pozice',
  'koncept',
  'vizualni_design',
  'programming',
];

export function BillableProducts({
  project,
  items,
  definitions,
  summary,
  onToggle,
  onDeselectAll,
  onOverrideMd,
  onResetOverride,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const defMap = new Map(definitions.map((d) => [d.id, d]));

  function startEdit(item: ProjectBillableItem) {
    setEditingId(item.id);
    setEditValue(String(item.md_value));
  }

  function commitEdit(item: ProjectBillableItem) {
    const newMd = parseFloat(editValue);
    if (!isNaN(newMd) && newMd >= 0) {
      onOverrideMd(item.id, newMd);
    }
    setEditingId(null);
  }

  function renderSection(sectionKey: SectionKey) {
    const sectionItems = items.filter((item) => {
      const def = defMap.get(item.product_definition_id);
      return def?.section_key === sectionKey;
    });

    if (sectionItems.length === 0) return null;

    const sectionTotal = sectionItems
      .filter((i) => i.enabled)
      .reduce((sum, i) => sum + i.price_value, 0);

    return (
      <div key={sectionKey} className="billable-section">
        <h4>{SECTION_LABELS[sectionKey]}</h4>
        <table className="table">
          <thead>
            <tr>
              <th className="col-check"></th>
              <th>Položka</th>
              <th>MD</th>
              <th>Cena</th>
              <th>Zdroj</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sectionItems.map((item) => {
              const def = defMap.get(item.product_definition_id);
              if (!def) return null;

              const sourceLabel = getSourceLabel(item.value_source);
              const isDerived = def.calculation_type === 'derived_from_screens';
              const isOverridden = item.overridden;
              const isEditing = editingId === item.id;

              return (
                <tr
                  key={item.id}
                  className={[
                    !item.enabled && 'row-disabled',
                    isDerived && 'row-derived',
                    isOverridden && 'row-overridden',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <td className="col-check">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => onToggle(item.id)}
                    />
                  </td>
                  <td>{def.label}</td>
                  <td className="col-md">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit(item);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="input-inline input-md"
                        autoFocus
                      />
                    ) : (
                      <span
                        className={`md-value ${def.override_allowed ? 'editable' : ''}`}
                        onClick={() => def.override_allowed && startEdit(item)}
                        title={def.override_allowed ? 'Klikněte pro úpravu' : ''}
                      >
                        {formatDecimal(item.md_value)}
                      </span>
                    )}
                  </td>
                  <td className="col-price">
                    {item.enabled ? formatCurrency(item.price_value) : '—'}
                  </td>
                  <td className="col-source">
                    <span className={`source-badge source-${item.value_source}`}>
                      {sourceLabel}
                    </span>
                  </td>
                  <td>
                    {isOverridden && (
                      <button
                        className="btn btn-small"
                        onClick={() => onResetOverride(item.id)}
                        title="Obnovit výchozí hodnotu"
                      >
                        Reset
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}><strong>Celkem {SECTION_LABELS[sectionKey]}</strong></td>
              <td className="col-price"><strong>{formatCurrency(sectionTotal)}</strong></td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  return (
    <div className="billable-tab">
      <div className="billable-header">
        <h3>Fakturovatelné položky</h3>
        <button onClick={onDeselectAll} className="btn btn-small">Odznačit vše</button>
      </div>

      {SECTION_ORDER.map((sk) => renderSection(sk))}

      {/* Summary */}
      {summary && (
        <div className="billable-summary">
          <h4>Souhrn kalkulace</h4>
          <table className="table table-summary">
            <tbody>
              <tr>
                <td>Mezisoučet fakturovatelných položek</td>
                <td className="col-price">{formatCurrency(summary.billableSubtotal)}</td>
              </tr>
              {project.complexity_coefficient_percent !== 100 && (
                <tr>
                  <td>Po koeficientu složitosti ({project.complexity_coefficient_percent} %)</td>
                  <td className="col-price">{formatCurrency(summary.adjustedSubtotal)}</td>
                </tr>
              )}
              <tr>
                <td>Project management ({project.pm_percent} %)</td>
                <td className="col-price">{formatCurrency(summary.pmAmount)}</td>
              </tr>
              {summary.slaTotal > 0 && (
                <tr>
                  <td>SLA ({summary.months} měs. × {formatCurrency(summary.slaMonthlyFee)})</td>
                  <td className="col-price">{formatCurrency(summary.slaTotal)}</td>
                </tr>
              )}
              <tr className="total-row">
                <td><strong>Celková cena projektu</strong></td>
                <td className="col-price"><strong>{formatCurrency(summary.projectTotal)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getSourceLabel(source: string): string {
  switch (source) {
    case 'manual_default':
      return 'výchozí';
    case 'derived_from_screens':
      return 'z obrazovek';
    case 'overridden_manual':
      return 'přepsáno';
    default:
      return source;
  }
}
