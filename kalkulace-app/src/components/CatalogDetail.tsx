import { useState } from 'react';
import type {
  BillableProductDefinition,
  SectionKey,
  CalculationType,
  PriceMode,
  WorkTypeKey,
} from '../types';
import { SECTION_LABELS, WORK_TYPE_LABELS } from '../types';

interface Props {
  definition: BillableProductDefinition;
  isNew: boolean;
  onSave: (def: BillableProductDefinition) => void;
  onCancel: () => void;
}

const SECTION_OPTIONS: SectionKey[] = [
  'pruzkum_a_pozice',
  'koncept',
  'vizualni_design',
  'programming',
];

const WORK_TYPE_OPTIONS: (WorkTypeKey | '')[] = [
  '',
  'ux_primary_desktop',
  'ux_secondary_mobile',
  'ui_primary_desktop',
  'ui_secondary_mobile',
  'webflow',
];

export function CatalogDetail({ definition, isNew, onSave, onCancel }: Props) {
  const [local, setLocal] = useState<BillableProductDefinition>({ ...definition });

  function update<K extends keyof BillableProductDefinition>(
    key: K,
    value: BillableProductDefinition[K],
  ) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!local.label.trim()) {
      alert('Název položky je povinný.');
      return;
    }
    onSave(local);
  }

  return (
    <div className="catalog-detail">
      <div className="catalog-detail-header">
        <h3>{isNew ? 'Nová položka' : `Upravit: ${definition.label}`}</h3>
        <button onClick={onCancel} className="btn">Zpět na seznam</button>
      </div>

      <div className="settings-section">
        <div className="form-grid">
          <div className="field">
            <label>Název</label>
            <input
              type="text"
              value={local.label}
              onChange={(e) => update('label', e.target.value)}
            />
          </div>

          <div className="field">
            <label>Sekce</label>
            <select
              value={local.section_key}
              onChange={(e) => update('section_key', e.target.value as SectionKey)}
            >
              {SECTION_OPTIONS.map((sk) => (
                <option key={sk} value={sk}>{SECTION_LABELS[sk]}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Typ výpočtu</label>
            <select
              value={local.calculation_type}
              onChange={(e) => update('calculation_type', e.target.value as CalculationType)}
            >
              <option value="manual">Manuální</option>
              <option value="derived_from_screens">Z obrazovek</option>
            </select>
          </div>

          {local.calculation_type === 'derived_from_screens' && (
            <div className="field">
              <label>Zdrojový typ práce</label>
              <select
                value={local.source_key ?? ''}
                onChange={(e) => update('source_key', (e.target.value || null) as WorkTypeKey | null)}
              >
                {WORK_TYPE_OPTIONS.map((wt) => (
                  <option key={wt} value={wt}>
                    {wt ? WORK_TYPE_LABELS[wt] : '— vyberte —'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {local.calculation_type === 'manual' && (
            <div className="field">
              <label>Výchozí MD</label>
              <input
                type="number"
                step="0.1"
                value={local.default_md ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  update('default_md', v === '' ? null : Number(v));
                }}
              />
            </div>
          )}

          <div className="field">
            <label>Cenotvorba</label>
            <select
              value={local.default_price_mode}
              onChange={(e) => update('default_price_mode', e.target.value as PriceMode)}
            >
              <option value="md_rate">MD sazba</option>
              <option value="fixed">Fixní cena</option>
            </select>
          </div>

          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={local.override_allowed}
              onChange={(e) => update('override_allowed', e.target.checked)}
            />
            <span>Povolit přepsání MD v projektu</span>
          </label>

          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={local.active}
              onChange={(e) => update('active', e.target.checked)}
            />
            <span>Aktivní</span>
          </label>

          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Popis (zobrazí se v Markdown výstupu)</label>
            <textarea
              value={local.description}
              onChange={(e) => update('description', e.target.value)}
              rows={4}
              placeholder="Popis položky pro cenovou nabídku..."
            />
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button onClick={handleSave} className="btn btn-primary">
            {isNew ? 'Vytvořit' : 'Uložit'}
          </button>
          <button onClick={onCancel} className="btn">Zrušit</button>
        </div>
      </div>
    </div>
  );
}
