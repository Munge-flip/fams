const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: { type: String, select: false },
  role: { type: String, enum: ['student', 'resident', 'admin'] },
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
