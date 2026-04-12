import { useEffect, useRef } from 'react';
import type { Project, GlobalSettings } from '../types';
import { formatCzechDate, formatCurrency, generateProjectCode } from '../lib/formatting';

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
      const code = generateProjectCode(project.name);
      if (code && code !== project.project_code) {
        onUpdate('project_code', code);
      }
    }, 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [project.name]);

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
            rows={3}
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
          value={type === 'number' ? (value as number) : (value as string)}
          onChange={(e) =>
            onUpdate(key, type === 'number' ? Number(e.target.value) : e.target.value)
          }
          className={isChanged ? 'input-warning' : ''}
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

      <div className="form-grid">
        {field('Verze', 'version_label')}
        {field('Datum projektu', 'project_date', 'date')}

        <div className="form-divider" />

        {field('Hodinová sazba (Kč)', 'hourly_rate', 'number', String(settings.default_hourly_rate), settings.default_hourly_rate)}
        <div className="field">
          <label>MD sazba (Kč) <span className="default-hint">hodinová × 8</span></label>
          <input type="text" value={formatCurrency(mdRate)} disabled className="input-computed" />
        </div>

        <div className="form-divider" />

        {field('Koeficient složitosti (%)', 'complexity_coefficient_percent', 'number', '100', 100)}
        {field('PM procento (%)', 'pm_percent', 'number', String(settings.default_pm_percent), settings.default_pm_percent)}

        <div className="form-divider" />

        {field('SLA měsíční paušál (Kč)', 'sla_monthly_fee', 'number', String(settings.default_sla_monthly_fee), settings.default_sla_monthly_fee)}
        {field('Dní do zahájení', 'days_to_start', 'number', String(settings.default_days_to_start))}
        <div className="field">
          <label>Předpokládané zahájení <span className="default-hint">vypočteno</span></label>
          <input type="text" value={formatCzechDate(project.expected_start_date)} disabled className="input-computed" />
        </div>
        {field('První mobilní sada', 'first_mobile_set', 'checkbox', settings.default_first_mobile_set ? 'ano' : 'ne')}

        <div className="form-divider" />

        {field('Poznámky', 'notes', 'textarea')}
      </div>
    </div>
  );
}
