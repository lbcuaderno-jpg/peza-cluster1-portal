const { verifySession, get, run } = require('../../../lib/db');
const { parseCookies } = require('../../../lib/utils');

async function getUser(req) {
  const cookies = parseCookies(req);
  return verifySession(cookies.portal_session);
}

module.exports = async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    res.status(400).json({ error: 'System ID is required' });
    return;
  }

  if (req.method === 'PUT') {
    const user = await getUser(req);
    if (!user || (user.role !== 'Super Admin' && user.role !== 'Examiner')) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { system_name, category, url, access_level, site, description, color } = req.body || {};
    const { section } = req.body || {};
    if (!system_name || !category || !url || !site) {
      res.status(400).json({ error: 'Required fields are missing' });
      return;
    }

    const existing = await get('SELECT id FROM systems WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'System not found' });
      return;
    }

    await run(
      'UPDATE systems SET system_name = ?, category = ?, url = ?, access_level = ?, site = ?, section = ?, description = ?, color = ? WHERE id = ?',
      [system_name, category, url, access_level || 'Staff', site, section || 'systems', description || '', color || 'v-blue', id]
    );

    res.status(200).json({});
    return;
  }

  if (req.method === 'DELETE') {
    const user = await getUser(req);
    if (!user || (user.role !== 'Super Admin' && user.role !== 'Examiner')) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const existing = await get('SELECT id FROM systems WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'System not found' });
      return;
    }

    await run('DELETE FROM systems WHERE id = ?', [id]);
    res.status(200).json({});
    return;
  }

  if (req.method === 'PATCH') {
    const user = await getUser(req);
    if (!user || (user.role !== 'Super Admin' && user.role !== 'Examiner')) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { archived } = req.body || {};
    const existing = await get('SELECT id FROM systems WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'System not found' });
      return;
    }

    const archiveValue = typeof archived === 'boolean' ? (archived ? 1 : 0) : 1;
    await run('UPDATE systems SET archived = ? WHERE id = ?', [archiveValue, id]);
    res.status(200).json({});
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
