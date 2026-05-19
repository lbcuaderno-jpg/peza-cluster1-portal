const { parseCookies, serializeCookie } = require('../../../lib/utils');
const { destroySession } = require('../../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const cookies = parseCookies(req);
  if (cookies.portal_session) {
    await destroySession(cookies.portal_session);
  }

  res.setHeader('Set-Cookie', serializeCookie('portal_session', '', {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
    sameSite: 'Lax'
  }));

  res.status(200).json({});
}
