import { useState, useEffect, useRef } from 'react';
import type { ProjectScreen, ScreenComplexityCalibration, WorkTypeKey } from '../types';
import { COMPLEXITY_PERCENTAGES, WORK_TYPE_LABELS } from '../types';
import { formatDecimal } from '../lib/formatting';

interface Props {
  screens: ProjectScreen[];
  calibration: ScreenComplexityCalibration[];
  onAdd: () => void;
  onAddMany: (names: string[]) => void;
  onSetFlagForAll: (field: keyof ProjectScreen, value: boolean) => void;
  onUpdate: (id: string, field: keyof ProjectScreen, value: unknown) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

const FLAG_KEYS: { key: keyof ProjectScreen; workType: WorkTypeKey; device: string }[] = [
  { key: 'ux_primary_desktop', workType: 'ux_primary_desktop', device: 'Desktop' },
  { key: 'ux_secondary_mobile', workType: 'ux_secondary_mobile', device: 'Mobil' },
  { key: 'ui_primary_desktop', workType: 'ui_primary_desktop', device: 'Desktop' },
  { key: 'ui_secondary_mobile', workType: 'ui_secondary_mobile', device: 'Mobil' },
  { key: 'webflow', workType: 'webflow', device: '' },
];

function TextCell({ value, onChange, placeholder, className }: {
  value: string; onChange: (v: string) => void; placeholder: string; className?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <td className={className}>
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === 'Enter') setEditing(false); }}
          placeholder={placeholder}
          className="input-inline"
        />
      </td>
    );
  }

  return (
    <td className={className} onClick={() => setEditing(true)}>
      <span className="name-text">{value || <em className="input-note">{placeholder}</em>}</span>
    </td>
  );
}

export function Screens({ screens, calibration, onAdd, onAddMany, onSetFlagForAll, onUpdate, onDuplicate, onRemove }: Props) {
  // Po přidání obrazovky klávesou Enter přesunout kurzor do jejího názvu
  const nameInputs = useRef(new Map<string, HTMLInputElement>());
  const focusLast = useRef(false);
  useEffect(() => {
    if (!focusLast.current) return;
    focusLast.current = false;
    const last = screens[screens.length - 1];
    if (last) nameInputs.current.get(last.id)?.focus();
  }, [screens]);

  function addAndFocus() {
    focusLast.current = true;
    onAdd();
  }

  // Vložení víc řádků do názvu (seznam obrazovek ze zadání) založí víc obrazovek
  function handleNamePaste(e: React.ClipboardEvent<HTMLInputElement>, screen: ProjectScreen) {
    const lines = e.clipboardData
      .getData('text')
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
      .filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    const [first, ...rest] = lines;
    onUpdate(screen.id, 'name', screen.name.trim() ? `${screen.name}${first}` : first);
    onAddMany(rest);
  }

  function toggleFlagForAll(key: keyof ProjectScreen) {
    const allOn = screens.every((s) => s[key]);
    onSetFlagForAll(key, !allOn);
  }

  function flagHeader(key: keyof ProjectScreen, label: string, rowSpan?: number) {
    const allOn = screens.length > 0 && screens.every((s) => s[key]);
    return (
      <th key={key} className="flag-col" rowSpan={rowSpan}>
        <button
          type="button"
          className="flag-header-btn"
          onClick={() => toggleFlagForAll(key)}
          title={allOn ? 'Vypnout u všech obrazovek' : 'Zapnout u všech obrazovek'}
        >
          {label}
        </button>
      </th>
    );
  }

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
        <button onClick={addAndFocus} className="btn btn-primary">
          + Přidat obrazovku
        </button>
      </div>

      {screens.length === 0 ? (
        <p className="empty-state">
          Zatím žádné obrazovky. Přidejte první obrazovku výše. Do názvu jde vložit celý seznam obrazovek
          ze zadání, každý řádek se stane jednou obrazovkou.
        </p>
      ) : (
        <div className="screens-table-wrapper">
          <table className="table screens-table">
            <thead>
              <tr>
                <th rowSpan={2}>#</th>
                <th rowSpan={2}>Název</th>
                <th rowSpan={2}>Složitost</th>
                <th colSpan={2} className="flag-group">UX</th>
                <th colSpan={2} className="flag-group">UI</th>
                {flagHeader('webflow', WORK_TYPE_LABELS.webflow, 2)}
                <th rowSpan={2}>Poznámka</th>
                <th rowSpan={2}></th>
              </tr>
              <tr>
                {FLAG_KEYS.filter((f) => f.device).map((f) => flagHeader(f.key, f.device))}
              </tr>
            </thead>
            <tbody>
              {screens.map((screen, idx) => (
                <tr key={screen.id}>
                  <td className="row-num">{idx + 1}</td>
                  <td className="name-cell">
                    <input
                      type="text"
                      ref={(el) => {
                        if (el) nameInputs.current.set(screen.id, el);
                        else nameInputs.current.delete(screen.id);
                      }}
                      value={screen.name}
                      onChange={(e) => onUpdate(screen.id, 'name', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && idx === screens.length - 1) addAndFocus();
                        else if (e.key === 'Enter') nameInputs.current.get(screens[idx + 1].id)?.focus();
                      }}
                      onPaste={(e) => handleNamePaste(e, screen)}
                      placeholder="Název obrazovky"
                      className="input-inline input-flat"
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
                          {c} ({Math.round((COMPLEXITY_PERCENTAGES[c] ?? 0) * 100)} %)
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
                  <TextCell
                    value={screen.note}
                    onChange={(val) => onUpdate(screen.id, 'note', val)}
                    placeholder="—"
                    className="note-cell"
                  />
                  <td className="action-btns">
                    <button className="btn btn-small" onClick={() => onDuplicate(screen.id)}>
                      Duplikovat
                    </button>
                    <button className="btn btn-small btn-danger" onClick={() => onRemove(screen.id)}>
                      Smazat
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
