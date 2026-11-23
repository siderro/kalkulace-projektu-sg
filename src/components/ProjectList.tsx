import { useState, useEffect } from 'react';
import type { Project } from '../types';
import { fetchProjects, deleteProject, duplicateProject } from '../lib/db';
import { formatCzechDate, formatCurrency } from '../lib/formatting';

interface Props {
  onOpen: (id: string) => void;
  onNew: () => void;
}

type SortKey = 'name' | 'client_name' | 'offer_total' | 'updated_at';
type SortDir = 'asc' | 'desc';

export function ProjectList({ onOpen, onNew }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    const data = await fetchProjects();
    setProjects(data);
    setLoading(false);
  }

  async function handleDuplicate(id: string, mode: 'copy' | 'version') {
    await duplicateProject(id, mode);
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
      setSortDir(key === 'name' || key === 'client_name' ? 'asc' : 'desc');
    }
  }

  const query = search.trim().toLocaleLowerCase('cs');
  const filtered = query
    ? projects.filter((p) => `${p.name} ${p.client_name}`.toLocaleLowerCase('cs').includes(query))
    : projects;

  const sortedProjects = [...filtered].sort((a, b) => {
    let cmp: number;
    if (sortKey === 'name' || sortKey === 'client_name') {
      cmp = (a[sortKey] || '').localeCompare(b[sortKey] || '', 'cs');
    } else if (sortKey === 'offer_total') {
      cmp = a.offer_total - b.offer_total;
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
        <input
          type="search"
          className="project-search"
          placeholder="Hledat projekt nebo klienta…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
              <th
                className={`sortable-th${sortKey === 'client_name' ? ' sort-active' : ''}`}
                onClick={() => handleSort('client_name')}
              >
                Klient{arrow('client_name')}
              </th>
              <th>Verze</th>
              <th>Datum</th>
              <th
                className={`sortable-th${sortKey === 'updated_at' ? ' sort-active' : ''}`}
                onClick={() => handleSort('updated_at')}
              >
                Poslední úprava{arrow('updated_at')}
              </th>
              <th
                className={`sortable-th col-price${sortKey === 'offer_total' ? ' sort-active' : ''}`}
                onClick={() => handleSort('offer_total')}
              >
                Cena{arrow('offer_total')}
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedProjects.length === 0 && (
              <tr>
                <td colSpan={7} className="input-note">Nic nenalezeno.</td>
              </tr>
            )}
            {sortedProjects.map((p) => (
              <tr key={p.id}>
                <td>
                  <button className="link-btn" onClick={() => onOpen(p.id)}>
                    {p.name || 'Bez názvu'}
                  </button>
                </td>
                <td>{p.client_name}</td>
                <td>{p.version_label}</td>
                <td>{formatCzechDate(p.project_date)}</td>
                <td>{new Date(p.updated_at).toLocaleString('cs-CZ')}</td>
                <td className="col-price">{p.offer_total > 0 ? formatCurrency(p.offer_total) : '–'}</td>
                <td className="action-btns">
                  <button
                    className="btn btn-small"
                    onClick={() => handleDuplicate(p.id, 'version')}
                    title="Kopie se stejným názvem, vyšší verzí a dnešním datem"
                  >
                    Nová verze
                  </button>
                  <button
                    className="btn btn-small"
                    onClick={() => handleDuplicate(p.id, 'copy')}
                    title="Kopie jako základ pro jiný projekt"
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
