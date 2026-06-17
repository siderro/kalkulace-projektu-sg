import { useState, useEffect } from 'react';
import type { Project } from '../types';
import { fetchProjects, deleteProject, duplicateProject } from '../lib/db';
import { formatCzechDate } from '../lib/formatting';

interface Props {
  onOpen: (id: string) => void;
  onNew: () => void;
}

type SortKey = 'name' | 'updated_at';
type SortDir = 'asc' | 'desc';

export function ProjectList({ onOpen, onNew }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    const data = await fetchProjects();
    setProjects(data);
    setLoading(false);
  }

  async function handleDuplicate(id: string) {
    await duplicateProject(id);
    await loadProjects();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Opravdu smazat projekt "${name}"?`)) return;
    await deleteProject(id);
    await loadProjects();
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  const sortedProjects = [...projects].sort((a, b) => {
    let cmp: number;
    if (sortKey === 'name') {
      cmp = (a.name || '').localeCompare(b.name || '', 'cs');
    } else {
      cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

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
              <th
                className={`sortable-th${sortKey === 'name' ? ' sort-active' : ''}`}
                onClick={() => handleSort('name')}
              >
                Název{arrow('name')}
              </th>
              <th>Verze</th>
              <th>Datum</th>
              <th
                className={`sortable-th${sortKey === 'updated_at' ? ' sort-active' : ''}`}
                onClick={() => handleSort('updated_at')}
              >
                Poslední úprava{arrow('updated_at')}
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedProjects.map((p) => (
              <tr key={p.id}>
                <td>
                  <button className="link-btn" onClick={() => onOpen(p.id)}>
                    {p.name || 'Bez názvu'}
                  </button>
                </td>
                <td>{p.version_label}</td>
                <td>{formatCzechDate(p.project_date)}</td>
                <td>{new Date(p.updated_at).toLocaleString('cs-CZ')}</td>
                <td className="action-btns">
                  <button
                    className="btn btn-small"
                    onClick={() => handleDuplicate(p.id)}
                  >
                    Duplikovat
                  </button>
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
