const mongoose = require('mongoose');

// One pending verification per user. The code is stored hashed, expires quickly, and the
// document is removed once the change is applied, the code expires, or the user resends.
const emailVerificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // Which change the code applies to: the primary email, the recovery email, the password,
  // or the primary email of a brand new account that has not been activated yet.
  target: { type: String, enum: ['email', 'recoveryEmail', 'password', 'registration'], default: 'email' },
  // The address the code was sent to. For a password change this is the account's own
  // primary email, because there is no new address to prove control of.
  pendingEmail: { type: String, required: true },
  // A password change holds the replacement password hashed for the life of the code. It is
  // never stored in clear, and it is only copied onto the account once the code comes back.
  pendingPasswordHash: { type: String, default: null },
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
