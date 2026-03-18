const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  visitor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor' },
  full_name: String,
  mobile: String,
  home_address: String,
  age: Number,
  shop_name: String,
  shop_address: String,
  selling_from_home: { type: Boolean, default: false },
  
  // File data stored as BSON (Buffer) for Vercel serverless persistence
  photo_data: {
    data: Buffer,
    contentType: String
  },
  id_proof_data: {
    data: Buffer,
    contentType: String
  },
  
  id_proof_type: String,
  tc_accepted: { type: Boolean, default: false },
  current_step: { type: Number, default: 0 },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
