import { useState, useEffect } from 'react';
import type { Project } from '../types';
import { fetchProjects, deleteProject } from '../lib/db';
import { formatCzechDate } from '../lib/formatting';

interface Props {
  onOpen: (id: string) => void;
  onNew: () => void;
}

export function ProjectList({ onOpen, onNew }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    const data = await fetchProjects();
    setProjects(data);
    setLoading(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Opravdu smazat projekt "${name}"?`)) return;
    await deleteProject(id);
    await loadProjects();
  }

  return (
    <div className="project-list">
      <div className="project-list-header">
        <h2>Projekty</h2>
        <button onClick={onNew} className="btn btn-primary">
          + Nový projekt
        </button>
      </div>

      {loading ? (
        <p>Načítání...</p>
      ) : projects.length === 0 ? (
        <p className="empty-state">Zatím žádné projekty. Vytvořte nový výše.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Název</th>
              <th>Verze</th>
              <th>Datum</th>
              <th>Poslední úprava</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>
                  <button className="link-btn" onClick={() => onOpen(p.id)}>
                    {p.name || 'Bez názvu'}
                  </button>
                </td>
                <td>{p.version_label}</td>
                <td>{formatCzechDate(p.project_date)}</td>
                <td>{new Date(p.updated_at).toLocaleString('cs-CZ')}</td>
                <td>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => handleDelete(p.id, p.name || 'Bez názvu')}
                  >
                    Smazat
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
