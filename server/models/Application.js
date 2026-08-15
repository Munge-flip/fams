const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'AidProgram' },
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'approved', 'denied', 'cash_released'],
    default: 'submitted',
  },
  personalInfo: {
    fullName: String,
    address: String,
    contactNo: String,
    birthdate: Date,
  },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  remarks: String,
  submittedAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

module.exports = mongoose.model('Application', applicationSchema);
