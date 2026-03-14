const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { initDB, getDB, saveDB } = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Ensure uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${req.params.type}_${req.params.id}_${Date.now()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ---- API ROUTES ----

// Store visitor data
app.post('/api/visitor', (req, res) => {
  try {
    const db = getDB();
    const d = req.body;
    const stmt = db.prepare(`
      INSERT INTO visitors (ip, city, region, country, latitude, longitude, isp, timezone, user_agent, screen_width, screen_height, language, referrer, browser_geo_lat, browser_geo_lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run([
      d.ip || null, d.city || null, d.region || null, d.country || null,
      d.latitude || null, d.longitude || null, d.isp || null, d.timezone || null,
      d.user_agent || null, d.screen_width || null, d.screen_height || null,
      d.language || null, d.referrer || null, d.browser_geo_lat || null, d.browser_geo_lng || null
    ]);
    stmt.free();
    saveDB();

    const result = db.exec('SELECT last_insert_rowid() as id');
    const visitorId = result[0].values[0][0];
    res.json({ success: true, visitorId });
  } catch (err) {
    console.error('Error saving visitor:', err);
    res.status(500).json({ error: 'Failed to save visitor data' });
  }
});

// Start application
app.post('/api/application/start', (req, res) => {
  try {
    const db = getDB();
    const { visitorId } = req.body;
    const stmt = db.prepare(`INSERT INTO applications (visitor_id, current_step) VALUES (?, 1)`);
    stmt.run([visitorId || null]);
    stmt.free();
    saveDB();

    const result = db.exec('SELECT last_insert_rowid() as id');
    const appId = result[0].values[0][0];
    res.json({ success: true, appId });
  } catch (err) {
    console.error('Error starting application:', err);
    res.status(500).json({ error: 'Failed to start application' });
  }
});

// Save step data
app.post('/api/application/:id/step/:step', (req, res) => {
  try {
    const db = getDB();
    const { id, step } = req.params;
    const data = req.body;
    const stepNum = parseInt(step);

    let sql = '';
    let params = [];

    switch (stepNum) {
      case 1:
        sql = `UPDATE applications SET full_name = ?, mobile = ?, current_step = 2, updated_at = datetime('now') WHERE id = ?`;
        params = [data.full_name, data.mobile, id];
        break;
      case 2:
        sql = `UPDATE applications SET home_address = ?, age = ?, current_step = 3, updated_at = datetime('now') WHERE id = ?`;
        params = [data.home_address, data.age, id];
        break;
      case 3:
        sql = `UPDATE applications SET shop_name = ?, shop_address = ?, selling_from_home = ?, current_step = 4, updated_at = datetime('now') WHERE id = ?`;
        params = [data.shop_name, data.shop_address, data.selling_from_home ? 1 : 0, id];
        break;
      case 4:
        sql = `UPDATE applications SET tc_accepted = ?, current_step = 5, status = 'under_review', updated_at = datetime('now') WHERE id = ?`;
        params = [data.tc_accepted ? 1 : 0, id];
        break;
      default:
        return res.status(400).json({ error: 'Invalid step' });
    }

    db.run(sql, params);
    saveDB();
    res.json({ success: true, step: stepNum });
  } catch (err) {
    console.error('Error saving step:', err);
    res.status(500).json({ error: 'Failed to save step data' });
  }
});

// Upload photo or ID proof
app.post('/api/upload/:type/:id', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const db = getDB();
    const { type, id } = req.params;
    const filePath = req.file.filename;

    let sql = '';
    if (type === 'photo') {
      sql = `UPDATE applications SET photo_path = ?, updated_at = datetime('now') WHERE id = ?`;
    } else if (type === 'id-proof') {
      sql = `UPDATE applications SET id_proof_path = ?, updated_at = datetime('now') WHERE id = ?`;
    } else {
      return res.status(400).json({ error: 'Invalid upload type' });
    }

    db.run(sql, [filePath, id]);
    saveDB();
    res.json({ success: true, filename: filePath });
  } catch (err) {
    console.error('Error uploading:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Set ID proof type
app.post('/api/application/:id/id-proof-type', (req, res) => {
  try {
    const db = getDB();
    db.run(`UPDATE applications SET id_proof_type = ?, updated_at = datetime('now') WHERE id = ?`, [req.body.type, req.params.id]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// SPA fallback
app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'verify.html'));
});
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'terms.html'));
});

// Start server
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`Retail Partner running at http://localhost:${PORT}`);
  });
}

start();
