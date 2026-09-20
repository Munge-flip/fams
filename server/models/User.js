const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  // Optional backup address. Informational only for now: login and notifications still
  // use the primary email.
  recoveryEmail: String,
  // Set to false only by self-registration. Accounts that predate email verification have
  // no value at all, which is why every check tests `=== false` rather than falsiness.
  emailVerified: Boolean,
  password: { type: String, select: false },
  role: { type: String, enum: ['student', 'resident', 'admin'] },
  verificationStatus: { type: String, enum: ['incomplete', 'pending', 'verified', 'needs_correction'], default: 'incomplete' },
  verificationRemarks: { type: String, default: '' },
  dateOfBirth: Date,
  address: String,
  school: String,
  father: {
    fullName: String,
    dob: Date,
    contact: String,
    occupation: String,
    employmentStatus: { type: String, enum: ['employed', 'unemployed', 'working_abroad', 'unknown', 'deceased', 'na'] },
    monthlyIncomeRange: String
  },
  mother: {
    fullName: String,
    dob: Date,
    contact: String,
    occupation: String,
    employmentStatus: { type: String, enum: ['employed', 'unemployed', 'working_abroad', 'unknown', 'deceased', 'na'] },
    monthlyIncomeRange: String
  },
  household: {
    memberCount: Number,
    dependentsCount: Number,
    currentlyStudyingCount: Number,
    monthlyIncomeRange: String,
    primaryIncomeSource: String,
    secondaryIncomeSource: String
  },
  studentID: String,
  course: String,
  yearLevel: Number,
  barangay: String,
  contactNo: String,
  aidCategory: String,
  office: String,
  adminLevel: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
