const { verifySession, all, run } = require('../../../lib/db');
const { parseCookies } = require('../../../lib/utils');

function requireAuth(req) {
  const cookies = parseCookies(req);
  return verifySession(cookies.portal_session);
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const systems = await all('SELECT * FROM systems ORDER BY archived ASC, created_at DESC');
    res.status(200).json({ systems });
    return;
  }

  if (req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user || (user.role !== 'Super Admin' && user.role !== 'Examiner')) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { system_name, category, url, access_level, site, description, color } = req.body || {};
    if (!system_name || !category || !url || !site) {
      res.status(400).json({ error: 'Required fields are missing' });
      return;
    }

    const result = await run(
      'INSERT INTO systems (system_name, category, url, access_level, site, description, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [system_name, category, url, access_level || 'Staff', site, description || '', color || 'v-blue', Date.now()]
    );

    res.status(201).json({ id: result.lastID });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
