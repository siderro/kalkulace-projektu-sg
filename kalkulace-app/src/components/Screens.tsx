import type { ProjectScreen, ScreenComplexityCalibration, WorkTypeKey } from '../types';
import { COMPLEXITY_PERCENTAGES, WORK_TYPE_LABELS } from '../types';
import { formatDecimal } from '../lib/formatting';

interface Props {
  screens: ProjectScreen[];
  calibration: ScreenComplexityCalibration[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof ProjectScreen, value: unknown) => void;
  onRemove: (id: string) => void;
}

const FLAG_KEYS: { key: keyof ProjectScreen; workType: WorkTypeKey }[] = [
  { key: 'ux_primary_desktop', workType: 'ux_primary_desktop' },
  { key: 'ux_secondary_mobile', workType: 'ux_secondary_mobile' },
  { key: 'ui_primary_desktop', workType: 'ui_primary_desktop' },
  { key: 'ui_secondary_mobile', workType: 'ui_secondary_mobile' },
  { key: 'webflow', workType: 'webflow' },
];

export function Screens({ screens, calibration, onAdd, onUpdate, onRemove }: Props) {
  // Compute per-screen MD for display
  function computeScreenWorkTypeMd(
    complexity: number,
    workType: WorkTypeKey,
    enabled: boolean,
  ): number {
    if (!enabled) return 0;
    const cal = calibration.find((c) => c.work_type_key === workType);
    if (!cal) return 0;
    return cal.base_md_at_level_5 * (COMPLEXITY_PERCENTAGES[complexity] ?? 0);
  }

  // Column totals
  function columnTotal(workType: WorkTypeKey): number {
    return screens.reduce((sum, s) => {
      const flagKey = workType as keyof ProjectScreen;
      return sum + computeScreenWorkTypeMd(s.complexity, workType, s[flagKey] as boolean);
    }, 0);
  }

  return (
    <div className="screens-tab">
      <div className="screens-header">
        <h3>Obrazovky</h3>
        <button onClick={onAdd} className="btn btn-primary">
          + Přidat obrazovku
        </button>
      </div>

      {screens.length === 0 ? (
        <p className="empty-state">Zatím žádné obrazovky. Přidejte první obrazovku výše.</p>
      ) : (
        <div className="screens-table-wrapper">
          <table className="table screens-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Název</th>
                <th>Složitost</th>
                {FLAG_KEYS.map((f) => (
                  <th key={f.key} className="flag-col" title={WORK_TYPE_LABELS[f.workType]}>
                    {WORK_TYPE_LABELS[f.workType].replace(/\(.*\)/, '').trim()}
                  </th>
                ))}
                <th>Poznámka</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {screens.map((screen, idx) => (
                <tr key={screen.id}>
                  <td className="row-num">{idx + 1}</td>
                  <td>
                    <input
                      type="text"
                      value={screen.name}
                      onChange={(e) => onUpdate(screen.id, 'name', e.target.value)}
                      placeholder="Název obrazovky"
                      className="input-inline"
                    />
                  </td>
                  <td>
                    <select
                      value={screen.complexity}
                      onChange={(e) =>
                        onUpdate(screen.id, 'complexity', Number(e.target.value))
                      }
                      className="input-inline input-select"
                    >
                      {[1, 2, 3, 4, 5].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  {FLAG_KEYS.map((f) => {
                    const enabled = screen[f.key] as boolean;
                    const md = computeScreenWorkTypeMd(
                      screen.complexity,
                      f.workType,
                      enabled,
                    );
                    return (
                      <td key={f.key} className="flag-col">
                        <label className="flag-cell">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) =>
                              onUpdate(screen.id, f.key, e.target.checked)
                            }
                          />
                          {enabled && (
                            <span className="flag-md">{formatDecimal(md)}</span>
                          )}
                        </label>
                      </td>
                    );
                  })}
                  <td>
                    <input
                      type="text"
                      value={screen.note}
                      onChange={(e) => onUpdate(screen.id, 'note', e.target.value)}
                      placeholder="—"
                      className="input-inline input-note"
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => onRemove(screen.id)}
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan={3}><strong>Celkem MD</strong></td>
                {FLAG_KEYS.map((f) => (
                  <td key={f.key} className="flag-col">
                    <strong>{formatDecimal(columnTotal(f.workType))}</strong>
                  </td>
                ))}
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

    </div>
  );
}
