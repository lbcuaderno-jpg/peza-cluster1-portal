import { useEffect, useMemo, useState } from 'react';

const initialForm = {
  system_name: '',
  category: '',
  url: '',
  access_level: 'Staff',
  site: 'examiner',
  section: 'systems',
  description: '',
  color: 'v-blue'
};

const sectionLabels = {
  systems: 'Systems & Portals',
  documents: 'Documents & Files',
  ledgers: 'e-Subsidiary Ledgers',
  auth: 'Authorized Signatories',
  references: 'References & MOs',
  sez: 'SEZ & IT Links',
  tutorials: 'Tutorials & Manuals'
};

function Home() {
  const [systems, setSystems] = useState([]);
  const [search, setSearch] = useState('');
  const [site, setSite] = useState('examiner');
  const [section, setSection] = useState('systems');
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [formState, setFormState] = useState(initialForm);
  const [formMode, setFormMode] = useState('add');
  const [editId, setEditId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    fetchSystems();
  }, [section]);

  async function fetchUser() {
    const resp = await fetch('/api/auth/me');
    const data = await resp.json();
    if (!data.error) {
      setUser(data.user);
    }
  }

  async function fetchSystems() {
    const resp = await fetch(`/api/systems?section=${encodeURIComponent(section)}`);
    const data = await resp.json();
    if (!data.error) {
      setSystems(data.systems || []);
    }
  }

  const activeSystems = useMemo(() => {
    const query = search.toLowerCase();
    return systems.filter((system) => {
      if (system.archived) return false;
      if (system.site !== site) return false;
      return [system.system_name, system.category, system.description, system.access_level]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [search, site, systems]);

  const archivedSystems = useMemo(() => {
    const query = search.toLowerCase();
    return systems.filter((system) => {
      if (!system.archived) return false;
      if (system.site !== site) return false;
      return [system.system_name, system.category, system.description, system.access_level]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [search, site, systems]);

  const isAdmin = user && (user.role === 'Super Admin' || user.role === 'Examiner');

  async function handleLogin(event) {
    event.preventDefault();
    const email = event.target.email.value;
    const password = event.target.password.value;
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await resp.json();
    if (data.error) {
      setLoginError(data.error);
      return;
    }
    setUser(data.user);
    setShowLogin(false);
    setLoginError('');
    fetchSystems();
  }

  async function handleLogout() {
    await fetch('/api/auth/logout');
    setUser(null);
  }

  function openForm(system) {
    if (system) {
      setFormMode('edit');
      setEditId(system.id);
      setFormState({
        system_name: system.system_name,
        category: system.category,
        url: system.url,
        access_level: system.access_level,
        site: system.site,
        section: system.section || section,
        description: system.description,
        color: system.color
      });
    } else {
      setFormMode('add');
      setEditId(null);
      setFormState({ ...initialForm, section });
    }
    setAdminMessage('');
  }

  async function handleSave(event) {
    event.preventDefault();
    const payload = { ...formState };

    const resp = await fetch(editId ? `/api/systems/${editId}` : '/api/systems', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (data.error) {
      setAdminMessage(data.error);
      return;
    }
    setAdminMessage(editId ? 'System updated.' : 'System added.');
    setFormState(initialForm);
    setEditId(null);
    setFormMode('add');
    fetchSystems();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this system?')) return;
    const resp = await fetch(`/api/systems/${id}`, { method: 'DELETE' });
    const data = await resp.json();
    if (data.error) {
      setAdminMessage(data.error);
      return;
    }
    setAdminMessage('System deleted.');
    fetchSystems();
  }

  async function handleArchive(id, archived = true) {
    const resp = await fetch(`/api/systems/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived })
    });
    const data = await resp.json();
    if (data.error) {
      setAdminMessage(data.error);
      return;
    }
    setAdminMessage(archived ? 'System archived.' : 'System restored.');
    fetchSystems();
  }

  return (
    <div>
      <main>
        <header className="topbar">
          <div className="brand">
            <div>
              <div className="brand-label">Cluster 1</div>
              <h1>Cluster 1 Portal</h1>
            </div>
            <div className="section-tabs">
              {[
                { key: 'systems', label: 'Systems & Portals' },
                { key: 'documents', label: 'Documents & Files' },
                { key: 'ledgers', label: 'e-Subsidiary Ledgers' },
                { key: 'auth', label: 'Authorized Signatories' },
                { key: 'references', label: 'References & MOs' },
                { key: 'sez', label: 'SEZ & IT Links' },
                { key: 'tutorials', label: 'Tutorials & Manuals' }
              ].map((item) => (
                <button
                  key={item.key}
                  className={section === item.key ? 'tab active' : 'tab'}
                  onClick={() => setSection(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="topbar-right">
              <input
                className="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items..."
              />
              {user ? (
                <>
                  <button className="button" onClick={handleLogout}>Logout</button>
                  <span className="user-badge">{user.username} · {user.role}</span>
                </>
              ) : (
                <button className="button" onClick={() => setShowLogin(true)}>Login</button>
              )}
            </div>
          </div>
          <div className="tabs">
            <button className={site === 'examiner' ? 'tab active' : 'tab'} onClick={() => setSite('examiner')}>IT Parks</button>
            <button className={site === 'sez' ? 'tab active' : 'tab'} onClick={() => setSite('sez')}>SEZ & IT</button>
          </div>
        </header>

        <section className="summary">
          <div>{sectionLabels[section]} · {activeSystems.length} active{isAdmin ? ` · ${archivedSystems.length} archived` : ''}</div>
          <div className="summary-actions">
            {isAdmin && (
              <button className="button" onClick={() => openForm(null)}>New item</button>
            )}
            {isAdmin && (
              <button className="button secondary" onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? 'Hide archived' : 'Show archived'}
              </button>
            )}
          </div>
        </section>

        <section className="grid">
          {activeSystems.map((system) => (
            <article key={system.id} className={`card ${system.color}`}>
              <div className="card-top">
                <span className="tag">{system.category}</span>
                <a className="arrow" href={system.url} target="_blank" rel="noreferrer">↗</a>
              </div>
              <h2>{system.system_name}</h2>
              <p>{system.description}</p>
              <div className="card-meta">
                <span>{system.access_level}</span>
                {isAdmin && (
                  <div className="admin-actions">
                    <button onClick={() => openForm(system)}>Edit</button>
                    <button onClick={() => handleArchive(system.id)}>Archive</button>
                    <button onClick={() => handleDelete(system.id)}>Delete</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>

        {showLogin && (
          <div className="modal-overlay" onClick={() => setShowLogin(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Portal login</h2>
              <form onSubmit={handleLogin}>
                <label>Email</label>
                <input name="email" type="email" required />
                <label>Password</label>
                <input name="password" type="password" required />
                {loginError && <p className="error">{loginError}</p>}
                <div className="modal-actions">
                  <button type="submit">Sign in</button>
                  <button type="button" onClick={() => setShowLogin(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isAdmin && showArchived && (
          <section className="archived-panel">
            <h2>Archived systems</h2>
            <div className="grid">
              {archivedSystems.length ? archivedSystems.map((system) => (
                <article key={system.id} className={`card ${system.color}`}>
                  <div className="card-top">
                    <span className="tag">{system.category}</span>
                    <a className="arrow" href={system.url} target="_blank" rel="noreferrer">↗</a>
                  </div>
                  <h2>{system.system_name}</h2>
                  <p>{system.description}</p>
                  <div className="card-meta">
                    <span>{system.access_level}</span>
                    <div className="admin-actions">
                      <button onClick={() => handleArchive(system.id, false)}>Restore</button>
                      <button onClick={() => handleDelete(system.id)}>Delete</button>
                    </div>
                  </div>
                </article>
              )) : <p className="info">No archived systems for this site.</p>}
            </div>
          </section>
        )}

        {isAdmin && (
          <div className="panel">
            <h3>{formMode === 'edit' ? `Edit ${sectionLabels[section]}` : `Add ${sectionLabels[section]}`}</h3>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <label>System name<input value={formState.system_name} onChange={(e) => setFormState({ ...formState, system_name: e.target.value })} required /></label>
                <label>Category<input value={formState.category} onChange={(e) => setFormState({ ...formState, category: e.target.value })} required /></label>
                <label>URL<input value={formState.url} onChange={(e) => setFormState({ ...formState, url: e.target.value })} required /></label>
                <label>Section<select value={formState.section} onChange={(e) => setFormState({ ...formState, section: e.target.value })}>
                  {Object.entries(sectionLabels).map(([key,label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select></label>
                <label>Site<select value={formState.site} onChange={(e) => setFormState({ ...formState, site: e.target.value })}>
                  <option value="examiner">IT Parks</option>
                  <option value="sez">SEZ & IT</option>
                </select></label>
                <label>Access level<select value={formState.access_level} onChange={(e) => setFormState({ ...formState, access_level: e.target.value })}>
                  <option>Super Admin</option>
                  <option>Examiner</option>
                  <option>Staff</option>
                  <option>Zone Admin</option>
                  <option>Guest</option>
                </select></label>
                <label>Color<select value={formState.color} onChange={(e) => setFormState({ ...formState, color: e.target.value })}>
                  <option value="v-blue">Blue</option>
                  <option value="v-green">Green</option>
                  <option value="v-amber">Amber</option>
                  <option value="v-purple">Purple</option>
                  <option value="v-rose">Rose</option>
                </select></label>
              </div>
              <label>Description<textarea value={formState.description} onChange={(e) => setFormState({ ...formState, description: e.target.value })} /></label>
              <div className="modal-actions">
                <button type="submit">Save</button>
                <button type="button" onClick={() => openForm(null)}>Reset</button>
              </div>
              {adminMessage && <p className="info">{adminMessage}</p>}
            </form>
          </div>
        )}
      </main>

      <style jsx global>{`
        :root { --bg: #f8fafc; --card: #ffffff; --panel: #f1f5f9; --border: #e2e8f0; --text: #0f172a; --muted: #64748b; --accent: #3b82f6; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, sans-serif; background: var(--bg); color: var(--text); }
        main { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .topbar { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
        .brand { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
        .brand-label { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); }
        h1 { margin: 0; font-size: 2rem; }
        .topbar-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .search { padding: 12px 16px; border-radius: 999px; border: 1px solid var(--border); min-width: 240px; }
        .button { border: none; background: var(--accent); color: #fff; padding: 10px 18px; border-radius: 999px; cursor: pointer; }
        .user-badge { background: var(--panel); border: 1px solid var(--border); padding: 10px 14px; border-radius: 999px; color: var(--muted); }
        .tabs { display: inline-flex; gap: 10px; }
        .tab { border: 1px solid var(--border); background: var(--card); padding: 10px 16px; border-radius: 999px; cursor: pointer; }
        .tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
        .summary { display: flex; justify-content: space-between; align-items: center; background: var(--card); border: 1px solid var(--border); padding: 18px; border-radius: 18px; margin-bottom: 18px; }
        .section-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .section-tabs .tab { background: #f8fafc; }
        .summary-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .secondary { background: #64748b; }
        .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
        .archived-panel { margin-top: 24px; }
        .archived-panel h2 { margin-bottom: 16px; }
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 20px; position: relative; display: flex; flex-direction: column; gap: 14px; }
        .card-top { display: flex; justify-content: space-between; align-items: center; }
        .tag { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; background: rgba(59, 130, 246, 0.12); color: var(--accent); padding: 5px 10px; border-radius: 999px; }
        .arrow { text-decoration: none; font-size: 18px; color: var(--muted); }
        h2 { margin: 0; font-size: 18px; }
        p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; }
        .card-meta { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .admin-actions button { background: transparent; border: 1px solid var(--border); border-radius: 999px; padding: 8px 12px; cursor: pointer; }
        .panel { margin-top: 24px; padding: 20px; border-radius: 20px; background: var(--card); border: 1px solid var(--border); }
        .form-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
        label { display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
        input, select, textarea { padding: 12px 14px; border-radius: 14px; border: 1px solid var(--border); background: var(--panel); font: inherit; }
        textarea { min-height: 100px; resize: vertical; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .modal { background: var(--card); border-radius: 24px; padding: 24px; width: min(500px, 100%); box-shadow: 0 20px 60px rgba(15,23,42,0.15); }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
        .error { color: #b91c1c; margin: 0; }
        .info { color: #334155; margin-top: 14px; }
        .v-blue { border-color: rgba(59, 130, 246, 0.2); }
        .v-green { border-color: rgba(16, 185, 129, 0.2); }
        .v-amber { border-color: rgba(245, 158, 11, 0.2); }
        .v-purple { border-color: rgba(139, 92, 246, 0.2); }
        .v-rose { border-color: rgba(244, 63, 94, 0.2); }
      `}</style>
    </div>
  );
}

export default Home;
