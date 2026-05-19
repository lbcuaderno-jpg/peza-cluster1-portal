const sqlite3 = require('sqlite3');
const { promisify } = require('util');
const { join } = require('path');
const { randomUUID, createHash } = require('crypto');

const dbFile = join(process.cwd(), 'data', 'portal.db');
const db = new sqlite3.Database(dbFile);

const runAsync = promisify(db.run.bind(db));
const getAsync = promisify(db.get.bind(db));
const allAsync = promisify(db.all.bind(db));

const ensureDb = new Promise((resolve, reject) => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT,
      created_at INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER,
      expires INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS systems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      system_name TEXT,
      category TEXT,
      url TEXT,
      access_level TEXT,
      site TEXT,
      section TEXT DEFAULT 'systems',
      description TEXT,
      color TEXT,
      archived INTEGER DEFAULT 0,
      created_at INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      created_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`, async (err) => {
      if (err) return reject(err);
      try {
        await seedDatabase();
        resolve();
      } catch (seedErr) {
        reject(seedErr);
      }
    });
  });
});

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

async function seedDatabase() {
  const userCount = await getAsync('SELECT COUNT(*) AS count FROM users');
  if (userCount && userCount.count > 0) {
    return;
  }

  const defaultUsers = [
    { username: 'admin', email: 'admin@peza.gov.ph', password: 'Admin123!', role: 'Super Admin' },
    { username: 'examiner', email: 'examiner@peza.gov.ph', password: 'Examiner123!', role: 'Examiner' },
    { username: 'staff', email: 'staff@peza.gov.ph', password: 'Staff123!', role: 'Staff' },
    { username: 'zoneadmin', email: 'zoneadmin@peza.gov.ph', password: 'Zone123!', role: 'Zone Admin' }
  ];

  for (const user of defaultUsers) {
    await runAsync(
      'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [user.username, user.email, hashPassword(user.password), user.role, Date.now()]
    );
  }

  const defaultSystems = [
    { system_name:'Ekonek IT Parks', category:'EZTS', url:'https://pezaezts.ekonek.com/ezts-it-parks/EkonekLogin', access_level:'Staff', site:'examiner', description:'e-Zone Transaction System login', color:'v-green' },
    { system_name:'IP Main Portal', category:'EIPS', url:'https://pezaapps.ekonek.com/eips/ipmain.jsp', access_level:'Staff', site:'examiner', description:'Import/Export processing', color:'v-blue' },
    { system_name:'AEDS Login', category:'AEDS', url:'https://pezaaeds.ekonek.com/login', access_level:'Staff', site:'examiner', description:'Annual Enterprise Data System', color:'v-purple' },
    { system_name:'PEZA ePay', category:'EPAY', url:'https://epay.peza.gov.ph/peza', access_level:'Staff', site:'sez', description:'Online payment portal', color:'v-rose' }
  ];

  for (const system of defaultSystems) {
    await runAsync(
      'INSERT INTO systems (system_name, category, url, access_level, site, description, color, section, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [system.system_name, system.category, system.url, system.access_level, system.site, system.description, system.color, system.section || 'systems', Date.now()]
    );
  }
}

async function run(sql, params = []) {
  await ensureDb;
  return runAsync(sql, params);
}

async function get(sql, params = []) {
  await ensureDb;
  return getAsync(sql, params);
}

async function all(sql, params = []) {
  await ensureDb;
  return allAsync(sql, params);
}

async function getUserByEmail(email) {
  return get('SELECT * FROM users WHERE email = ?', [email]);
}

async function createSession(userId) {
  const token = randomUUID();
  const expires = Date.now() + 30 * 60 * 1000;
  await run('INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)', [token, userId, expires]);
  return { token, expires };
}

async function getUserBySession(token) {
  if (!token) return null;
  const session = await get('SELECT * FROM sessions WHERE token = ?', [token]);
  if (!session || session.expires < Date.now()) {
    return null;
  }
  const user = await get('SELECT id, username, email, role FROM users WHERE id = ?', [session.user_id]);
  if (!user) return null;
  return user;
}

async function destroySession(token) {
  return run('DELETE FROM sessions WHERE token = ?', [token]);
}

async function verifySession(token) {
  return getUserBySession(token);
}

module.exports = {
  hashPassword,
  getUserByEmail,
  createSession,
  destroySession,
  getUserBySession,
  verifySession,
  run,
  get,
  all
};
