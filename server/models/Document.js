const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  docType: { type: String, enum: ['valid_id', 'certificate_of_indigency', 'grades', 'other'] },
  fileURL: String,
  publicID: String,
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Document', documentSchema);
