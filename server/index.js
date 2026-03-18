const express = require('express');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');

// Mongoose Models
const Visitor = require('./models/Visitor');
const Application = require('./models/Application');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://retailytextilepartner_db_user:Hl27UZ6XOibFOhhv@retailpartnerdb.zwcvn3y.mongodb.net/retailpartner?retryWrites=true&w=majority';

// Try connecting immediately for serverless warm up
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
};
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Multer config using MemoryStorage for Serverless deployment
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware to ensure DB connection on every request
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// ---- API ROUTES ----

// Store visitor data
app.post('/api/visitor', async (req, res) => {
  try {
    const d = req.body;
    const clientIp = d.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || req.socket?.remoteAddress || null;

    const visitor = await Visitor.create({
      ip: clientIp,
      city: d.city,
      region: d.region,
      country: d.country,
      latitude: d.latitude,
      longitude: d.longitude,
      isp: d.isp,
      timezone: d.timezone,
      user_agent: d.user_agent,
      screen_width: d.screen_width,
      screen_height: d.screen_height,
      language: d.language,
      referrer: d.referrer,
      browser_geo_lat: d.browser_geo_lat,
      browser_geo_lng: d.browser_geo_lng
    });

    console.log('Visitor saved with ID:', visitor._id);
    res.json({ success: true, visitorId: visitor._id });
  } catch (err) {
    console.error('Error saving visitor:', err);
    res.status(500).json({ error: 'Failed to save visitor data' });
  }
});

// Start application
app.post('/api/application/start', async (req, res) => {
  try {
    const { visitorId } = req.body;
    
    // Ensure visitorId is a valid ObjectId if provided
    let vid = null;
    if (visitorId && mongoose.isValidObjectId(visitorId)) {
      vid = visitorId;
    }

    const application = await Application.create({
      visitor_id: vid,
      current_step: 1
    });

    res.json({ success: true, appId: application._id });
  } catch (err) {
    console.error('Error starting application:', err);
    res.status(500).json({ error: 'Failed to start application' });
  }
});

// Save step data
app.post('/api/application/:id/step/:step', async (req, res) => {
  try {
    const { id, step } = req.params;
    const data = req.body;
    const stepNum = parseInt(step);

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid app ID' });

    let updateData = {};

    switch (stepNum) {
      case 1:
        updateData = { full_name: data.full_name, mobile: data.mobile, current_step: 2 };
        break;
      case 2:
        updateData = { home_address: data.home_address, age: data.age, current_step: 3 };
        break;
      case 3:
        updateData = { shop_name: data.shop_name, shop_address: data.shop_address, selling_from_home: !!data.selling_from_home, current_step: 4 };
        break;
      case 4:
        updateData = { tc_accepted: !!data.tc_accepted, current_step: 5, status: 'under_review' };
        break;
      default:
        return res.status(400).json({ error: 'Invalid step' });
    }

    await Application.findByIdAndUpdate(id, updateData);
    console.log(`Step ${stepNum} saved for application ${id}`);
    res.json({ success: true, step: stepNum });
  } catch (err) {
    console.error('Error saving step:', err);
    res.status(500).json({ error: 'Failed to save step data' });
  }
});

// Upload photo or ID proof (stored as Buffer in MongoDB)
app.post('/api/upload/:type/:id', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { type, id } = req.params;

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid app ID' });

    let updateData = {};
    if (type === 'photo') {
      updateData = { photo_data: { data: req.file.buffer, contentType: req.file.mimetype }};
    } else if (type === 'id-proof') {
      updateData = { id_proof_data: { data: req.file.buffer, contentType: req.file.mimetype }};
    } else {
      return res.status(400).json({ error: 'Invalid upload type' });
    }

    await Application.findByIdAndUpdate(id, updateData);
    console.log(`Upload (${type}) saved for application ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error uploading:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Set ID proof type
app.post('/api/application/:id/id-proof-type', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid app ID' });

    await Application.findByIdAndUpdate(id, { id_proof_type: req.body.type });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating ID proof type:', err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

// Endpoint to retrieve uploaded media directly from MongoDB
app.get('/api/media/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const appDoc = await Application.findById(id);
    if (!appDoc) return res.status(404).send('Not found');

    let fileData = null;
    if (type === 'photo' && appDoc.photo_data && appDoc.photo_data.data) {
      fileData = appDoc.photo_data;
    } else if (type === 'id-proof' && appDoc.id_proof_data && appDoc.id_proof_data.data) {
      fileData = appDoc.id_proof_data;
    }

    if (!fileData) return res.status(404).send('File not found');

    res.set('Content-Type', fileData.contentType);
    res.send(fileData.data);
  } catch (err) {
    res.status(500).send('Error retrieving media');
  }
});

// ---- ADMIN API ----

app.get('/api/admin/visitors', async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ createdAt: -1 }).lean();
    res.json(visitors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch visitors' });
  }
});

app.get('/api/admin/applications', async (req, res) => {
  try {
    // Exclude raw file buffers to prevent massive JSON payloads
    const apps = await Application.find({}, { 
      'photo_data.data': 0, 
      'id_proof_data.data': 0 
    }).sort({ createdAt: -1 }).lean();
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// SPA fallback routes
app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'verify.html'));
});
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'terms.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Export serverless handler
module.exports = app;

// Also listen if run directly (e.g. locally via node)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Retail Partner running at http://localhost:${PORT}`);
  });
}
