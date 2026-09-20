const mongoose = require('mongoose');

// One pending email change per user. The code is stored hashed, expires quickly, and the
// document is removed once the change is applied, the code expires, or the user resends.
const emailVerificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // Which address the code applies to: the primary email, the recovery email, or the
  // primary email of a brand new account that has not been activated yet.
  target: { type: String, enum: ['email', 'recoveryEmail', 'registration'], default: 'email' },
  pendingEmail: { type: String, required: true },
  codeHash: { type: String, required: true },
  // True when the last send attempt failed. The record is kept so the verification screen can
  // explain what happened, but it never blocks a retry and its code can never be confirmed.
  deliveryFailed: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  sentAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
