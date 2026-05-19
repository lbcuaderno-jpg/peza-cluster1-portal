const { parseCookies } = require('../../../lib/utils');
const { getUserBySession } = require('../../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const cookies = parseCookies(req);
  const user = await getUserBySession(cookies.portal_session);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.status(200).json({ user });
}
