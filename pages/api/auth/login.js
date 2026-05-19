const { getUserByEmail, hashPassword, createSession } = require('../../../lib/db');
const { serializeCookie } = require('../../../lib/utils');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await getUserByEmail(normalizedEmail);
  if (!user || user.password !== hashPassword(password)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const session = await createSession(user.id);
  res.setHeader('Set-Cookie', serializeCookie('portal_session', session.token, {
    httpOnly: true,
    path: '/',
    maxAge: 30 * 60,
    sameSite: 'Lax'
  }));

  res.status(200).json({ user: { id: user.id, username: user.username, email: user.email, role: user.role } });
}
