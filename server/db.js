const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'retailpartner.db');

let db = null;

async function initDB() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT,
      city TEXT,
      region TEXT,
      country TEXT,
      latitude REAL,
      longitude REAL,
      isp TEXT,
      timezone TEXT,
      user_agent TEXT,
      screen_width INTEGER,
      screen_height INTEGER,
      language TEXT,
      referrer TEXT,
      browser_geo_lat REAL,
      browser_geo_lng REAL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id INTEGER,
      full_name TEXT,
      mobile TEXT,
      home_address TEXT,
      age INTEGER,
      shop_name TEXT,
      shop_address TEXT,
      selling_from_home INTEGER DEFAULT 0,
      photo_path TEXT,
      id_proof_path TEXT,
      id_proof_type TEXT,
      tc_accepted INTEGER DEFAULT 0,
      current_step INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (visitor_id) REFERENCES visitors(id)
    )
  `);

  saveDB();
  return db;
}

function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function getDB() {
  return db;
}

module.exports = { initDB, getDB, saveDB };
