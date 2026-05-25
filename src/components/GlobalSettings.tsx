import { useState } from 'react';
import type {
  GlobalSettings as GlobalSettingsType,
  ScreenComplexityCalibration,
  BillableProductDefinition,
} from '../types';
import { COMPLEXITY_LEVELS, COMPLEXITY_PERCENTAGES } from '../types';
import { formatDecimal } from '../lib/formatting';
import { CatalogList } from './CatalogList';
import { CatalogDetail } from './CatalogDetail';

interface Props {
  settings: GlobalSettingsType;
  calibration: ScreenComplexityCalibration[];
  definitions: BillableProductDefinition[];
  onUpdateSettings: (s: Partial<GlobalSettingsType>) => Promise<void>;
  onUpdateCalibration: (row: Partial<ScreenComplexityCalibration> & { id: string }) => Promise<void>;
  onUpdateDefinition: (def: Partial<BillableProductDefinition> & { id: string }) => Promise<void>;
  onCreateDefinition: (def: Omit<BillableProductDefinition, 'id'>) => Promise<BillableProductDefinition | null>;
  onDeleteDefinition: (id: string) => Promise<void>;
  onReorderDefinition: (id: string, direction: 'up' | 'down') => Promise<void>;
  onClose: () => void;
}

type SettingsTab = 'basic' | 'calibration' | 'catalog' | 'markdown';

const SETTINGS_TAB_LABELS: Record<SettingsTab, string> = {
  basic: 'Základní nastavení',
  calibration: 'Kalibrační tabulka',
  catalog: 'Fakturovatelné produkty',
  markdown: 'Markdown',
};

type CatalogView =
  | { mode: 'list' }
  | { mode: 'detail'; def: BillableProductDefinition; isNew: boolean };

export function GlobalSettingsPanel({
  settings,
  calibration,
  definitions,
  onUpdateSettings,
  onUpdateCalibration,
  onUpdateDefinition,
  onCreateDefinition,
  onDeleteDefinition,
  onReorderDefinition,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('basic');
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState({ ...settings });
  const [catalogView, setCatalogView] = useState<CatalogView>({ mode: 'list' });

  async function handleSave() {
    setSaving(true);
    await onUpdateSettings(local);
    setSaving(false);
  }

  function update(key: keyof GlobalSettingsType, value: unknown) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function handleNewDefinition() {
    const maxSort = definitions.reduce((max, d) => Math.max(max, d.sort_order), 0);
    const newDef: BillableProductDefinition = {
      id: '',
      section_key: 'pruzkum_a_pozice',
      label: '',
      description: '',
      calculation_type: 'manual',
      source_key: null,
      default_enabled: false,
      default_md: 1,
      default_price_mode: 'md_rate',
      override_allowed: true,
      sort_order: maxSort + 10,
      active: true,
    };
    setCatalogView({ mode: 'detail', def: newDef, isNew: true });
  }

  async function handleSaveDefinition(def: BillableProductDefinition) {
    if (catalogView.mode === 'detail' && catalogView.isNew) {
      const { id: _, ...rest } = def;
      await onCreateDefinition(rest);
    } else {
      await onUpdateDefinition(def);
    }
    setCatalogView({ mode: 'list' });
  }

  return (
    <div className="global-settings">
      <div className="settings-header">
        <h2>Nastavení</h2>
        <button onClick={onClose} className="btn">Zavřít</button>
      </div>

      <nav className="tabs">
        {(Object.keys(SETTINGS_TAB_LABELS) as SettingsTab[]).map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {SETTINGS_TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      <div className="settings-content">
        {activeTab === 'basic' && (
          <div className="settings-section">
            <h3>Výchozí hodnoty</h3>
            <div className="form-grid">
              <div className="field">
                <label>Výchozí hodinová sazba (Kč)</label>
                <input
                  type="number"
                  value={local.default_hourly_rate}
                  onChange={(e) => update('default_hourly_rate', Number(e.target.value))}
                />
              </div>
              <div className="field">
                <label>Výchozí PM procento (%)</label>
                <input
                  type="number"
                  value={local.default_pm_percent}
                  onChange={(e) => update('default_pm_percent', Number(e.target.value))}
                />
              </div>
              <div className="field">
                <label>Výchozí SLA měsíční paušál (Kč)</label>
                <input
                  type="number"
                  value={local.default_sla_monthly_fee}
                  onChange={(e) => update('default_sla_monthly_fee', Number(e.target.value))}
                />
              </div>
              <div className="field">
                <label>Výchozí dní do zahájení</label>
                <input
                  type="number"
                  value={local.default_days_to_start}
                  onChange={(e) => update('default_days_to_start', Number(e.target.value))}
                />
              </div>
              <label className="field field-checkbox">
                <input
                  type="checkbox"
                  checked={local.default_first_mobile_set}
                  onChange={(e) => update('default_first_mobile_set', e.target.checked)}
                />
                <span>Výchozí: první mobilní sada</span>
              </label>
            </div>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Ukládání...' : 'Uložit nastavení'}
            </button>
          </div>
        )}

        {activeTab === 'calibration' && (
          <div className="settings-section">
            <h3>Kalibrační tabulka (báze MD při složitosti 5)</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Typ práce</th>
                  <th>Báze MD</th>
                </tr>
              </thead>
              <tbody>
                {calibration.map((c) => (
                  <CalibrationRow key={c.id} row={c} onSave={onUpdateCalibration} />
                ))}
              </tbody>
            </table>

            <h3 style={{ marginTop: 24 }}>Procenta složitosti</h3>
            <table className="table table-small">
              <thead>
                <tr>
                  <th>Složitost</th>
                  {COMPLEXITY_LEVELS.map((l) => (
                    <th key={l} style={{ textAlign: 'center' }}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Procento z báze</td>
                  {COMPLEXITY_LEVELS.map((l) => (
                    <td key={l} style={{ textAlign: 'center' }}>{Math.round(COMPLEXITY_PERCENTAGES[l] * 100)} %</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="settings-section">
            {catalogView.mode === 'list' ? (
              <CatalogList
                definitions={definitions}
                onEdit={(def) => setCatalogView({ mode: 'detail', def, isNew: false })}
                onNew={handleNewDefinition}
                onDelete={onDeleteDefinition}
                onReorder={onReorderDefinition}
              />
            ) : (
              <CatalogDetail
                definition={catalogView.def}
                isNew={catalogView.isNew}
                onSave={handleSaveDefinition}
                onCancel={() => setCatalogView({ mode: 'list' })}
              />
            )}
          </div>
        )}

        {activeTab === 'markdown' && (
          <div className="settings-section">
            <h3>Nastavení Markdown výstupu</h3>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Dodavatel</label>
              <textarea
                value={local.md_supplier_info}
                onChange={(e) => update('md_supplier_info', e.target.value)}
                rows={5}
              />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Kontakty</label>
              <textarea
                value={local.md_contacts}
                onChange={(e) => update('md_contacts', e.target.value)}
                rows={4}
              />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Reference</label>
              <textarea
                value={local.md_references}
                onChange={(e) => update('md_references', e.target.value)}
                rows={3}
              />
            </div>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Ukládání...' : 'Uložit nastavení'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Inline calibration row editor ---

function CalibrationRow({
  row,
  onSave,
}: {
  row: ScreenComplexityCalibration;
  onSave: (r: Partial<ScreenComplexityCalibration> & { id: string }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(row.base_md_at_level_5));

  async function handleSave() {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      await onSave({ id: row.id, base_md_at_level_5: num });
    }
    setEditing(false);
  }

  return (
    <tr>
      <td>{row.label}</td>
      <td>
        {editing ? (
          <input
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="input-inline input-md"
            autoFocus
          />
        ) : (
          <span
            className="md-value editable"
            onClick={() => setEditing(true)}
          >
            {formatDecimal(row.base_md_at_level_5)}
          </span>
        )}
      </td>
    </tr>
  );
}
