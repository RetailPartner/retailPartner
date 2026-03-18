const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  ip: String,
  city: String,
  region: String,
  country: String,
  latitude: Number,
  longitude: Number,
  isp: String,
  timezone: String,
  user_agent: String,
  screen_width: Number,
  screen_height: Number,
  language: String,
  referrer: String,
  browser_geo_lat: Number,
  browser_geo_lng: Number,
}, { timestamps: true }); // Automatically handles created_at (createdAt) and updated_at (updatedAt)

module.exports = mongoose.model('Visitor', visitorSchema);
