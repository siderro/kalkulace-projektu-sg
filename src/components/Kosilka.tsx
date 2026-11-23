import { useEffect, useRef, useState } from 'react';
import type { Project, GlobalSettings } from '../types';
import { formatCurrency, generateProjectCode, projectCodeMatchesName } from '../lib/formatting';
import { fetchAresCompany } from '../lib/ares';

interface Props {
  project: Project;
  settings: GlobalSettings;
  mdRate: number;
  onUpdate: (field: keyof Project, value: unknown) => void;
}

export function Kosilka({ project, settings, mdRate, onUpdate }: Props) {
  // Debounced project code generation — 3s after name stops changing
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Nový kód jen když se změnil název (kód obsahuje čas, jinak by se měnil při každém otevření)
      if (projectCodeMatchesName(project.project_code, project.name)) return;
      const code = generateProjectCode(project.name);
      if (code) onUpdate('project_code', code);
    }, 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [project.name]);

  // Načtení klienta z ARES podle IČO (přepíše název, sídlo a DIČ)
  const [aresState, setAresState] = useState<{ loading: boolean; error: string }>({ loading: false, error: '' });
  async function loadFromAres() {
    setAresState({ loading: true, error: '' });
    try {
      const company = await fetchAresCompany(project.client_ico);
      onUpdate('client_name', company.name);
      onUpdate('client_address', company.address);
      onUpdate('client_dic', company.dic);
      setAresState({ loading: false, error: '' });
    } catch (e) {
      setAresState({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  function field(
    label: string,
    key: keyof Project,
    type: 'text' | 'number' | 'date' | 'checkbox' | 'textarea' = 'text',
    defaultHint?: string,
    defaultValue?: number | boolean,
  ) {
    const value = project[key];
    const isChanged = defaultValue !== undefined && value !== defaultValue;

    if (type === 'checkbox') {
      return (
        <label className="field field-checkbox">
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => onUpdate(key, e.target.checked)}
          />
          <span>{label}</span>
          {defaultHint && <span className="default-hint">(výchozí: {defaultHint}){isChanged ? ' ⚠️' : ''}</span>}
        </label>
      );
    }

    if (type === 'textarea') {
      return (
        <div className="field">
          <label>{label}</label>
          <textarea
            value={value as string}
            onChange={(e) => onUpdate(key, e.target.value)}
            rows={4}
          />
        </div>
      );
    }

    return (
      <div className="field">
        <label>
          {label}
          {defaultHint && <span className="default-hint"> (výchozí: {defaultHint}){isChanged ? ' ⚠️' : ''}</span>}
        </label>
        <input
          type={type}
          value={type === 'number' ? (value as number) : ((value as string | null) ?? '')}
          onChange={(e) =>
            onUpdate(
              key,
              type === 'number'
                ? Number(e.target.value)
                : type === 'date' && !e.target.value
                  ? null
                  : e.target.value,
            )
          }
          className={isChanged ? 'input-warning' : ''}
        />
      </div>
    );
  }

  // Text sekce nabídky s výchozí hodnotou z Nastavení; prázdné pole = výchozí text
  function defaultText(label: string, key: 'references_override' | 'exclusions_extra', defaultValue: string, rows: number) {
    const own = project[key];
    const value = own.trim() ? own : defaultValue;
    const changed = value.trim() !== defaultValue.trim();
    return (
      <div className="field">
        <label>
          {label}{' '}
          <span className="default-hint">{changed ? 'upraveno pro tento projekt' : 'výchozí text z Nastavení'}</span>
          {changed && (
            <>
              {' '}
              <button type="button" className="link-btn" onClick={() => onUpdate(key, defaultValue)}>
                Obnovit výchozí
              </button>
            </>
          )}
        </label>
        <textarea
          value={value}
          onChange={(e) => onUpdate(key, e.target.value)}
          rows={rows}
          className={changed ? 'input-warning' : ''}
        />
      </div>
    );
  }

  return (
    <div className="kosilka">
      <h3>Košilka projektu</h3>

      <div className="field field-prominent">
        <label>
          Název projektu
          {project.project_code && (
            <span className="project-code">{project.project_code}</span>
          )}
        </label>
        <input
          type="text"
          value={project.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          placeholder="Název projektu..."
        />
      </div>

      <section className="kosilka-block">
        <h4>Klient</h4>
        <div className="form-grid">
          <div className="field">
            <label>IČO klienta</label>
            <div className="input-with-button">
              <input
                type="text"
                value={project.client_ico}
                onChange={(e) => onUpdate('client_ico', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && project.client_ico.trim()) loadFromAres(); }}
              />
              <button
                type="button"
                className="btn btn-small"
                onClick={loadFromAres}
                disabled={!project.client_ico.trim() || aresState.loading}
              >
                {aresState.loading ? 'Načítám…' : 'Načíst z ARES'}
              </button>
            </div>
            {aresState.error && <span className="field-error">{aresState.error}</span>}
          </div>
          {field('Klient (firma)', 'client_name')}
          {field('Sídlo', 'client_address')}
          {field('DIČ', 'client_dic')}
          {field('Kontaktní osoba klienta', 'client_contact')}
        </div>
      </section>

      <section className="kosilka-block">
        <h4>Verze a termíny</h4>
        <div className="form-grid">
          {field('Verze', 'version_label')}
          {field('Datum verze', 'project_date', 'date')}
          {field('Začátek projektu', 'start_date', 'date')}
          {field('Konec projektu', 'end_date', 'date')}
        </div>
      </section>

      <section className="kosilka-block">
        <h4>Sazby a cena</h4>
        <div className="form-grid">
          {field('Hodinová sazba (Kč)', 'hourly_rate', 'number', String(settings.default_hourly_rate), settings.default_hourly_rate)}
          <div className="field">
            <label>MD sazba (Kč) <span className="default-hint">hodinová × 8</span></label>
            <input type="text" value={formatCurrency(mdRate)} disabled className="input-computed" />
          </div>
          {field('Koeficient složitosti (%)', 'complexity_coefficient_percent', 'number', '100', 100)}
          {field('PM procento (%)', 'pm_percent', 'number', String(settings.default_pm_percent), settings.default_pm_percent)}
          {field('První mobilní sada', 'first_mobile_set', 'checkbox', settings.default_first_mobile_set ? 'ano' : 'ne')}
        </div>
      </section>

      <section className="kosilka-block">
        <h4>Podpora po spuštění</h4>
        <div className="form-grid">
          {field('Paušál (Kč/měs.)', 'sla_monthly_fee', 'number', String(settings.default_sla_monthly_fee), settings.default_sla_monthly_fee)}
          {field('Počet měsíců v ceně', 'sla_months', 'number', '1', 1)}
        </div>
      </section>

      <section className="kosilka-block">
        <h4>Texty do nabídky</h4>
        <div className="form-grid form-grid-texts">
          {field('Cíl projektu', 'goal', 'textarea')}
          {field('Poznámky', 'notes', 'textarea')}
          {project.references_disabled ? (
            <div className="field">
              <label>Podobné projekty, které jsme dělali</label>
              <label className="field-checkbox">
                <input type="checkbox" checked onChange={() => onUpdate('references_disabled', false)} />
                Netisknout reference v této nabídce
              </label>
            </div>
          ) : (
            <div className="field">
              {defaultText('Podobné projekty, které jsme dělali', 'references_override', settings.md_references, 6)}
              <label className="field-checkbox">
                <input type="checkbox" checked={false} onChange={() => onUpdate('references_disabled', true)} />
                Netisknout reference v této nabídce
              </label>
            </div>
          )}
          {defaultText('Co nabídka nezahrnuje', 'exclusions_extra', settings.md_exclusions, 6)}
        </div>
      </section>
    </div>
  );
}
