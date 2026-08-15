const mongoose = require('mongoose');

const aidProgramSchema = new mongoose.Schema({
  title: String,
  description: String,
  eligibility: String,
  slots: Number,
  deadline: Date,
  category: { type: String, enum: ['scholarship', 'barangay', 'emergency'] },
  status: { type: String, enum: ['active', 'closed'] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AidProgram', aidProgramSchema);
