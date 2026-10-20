const express = require('express');
const {
  register, login, logout, me, updateProfile, submitVerificationProfile,
  requestEmailChange, confirmVerificationCode, setRecoveryEmail, removeRecoveryEmail, changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  loginLimiter, registerLimiter, verificationCodeRequestLimiter, verificationConfirmLimiter,
} = require('../middleware/rateLimit');

const router = express.Router();

// The per-IP limiters run before the auth middleware so the limit counts every request against
// the route, signed in or not, and so a flood is stopped before any token or database work.

// Brute-force target: ten failed sign-ins per address per fifteen minutes.
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/logout', protect, logout);
router.get('/me', protect, me);
router.patch('/profile', protect, updateProfile);
// The beneficiary profile is open to every signed-in account.
router.patch('/verification-profile', protect, submitVerificationProfile);
// Account & security: shared by every role (see client Settings page). Everything below that
// mails a 6-digit code draws on one shared hourly allowance per address.
router.patch('/password', verificationCodeRequestLimiter, protect, changePassword);
router.put('/recovery-email', verificationCodeRequestLimiter, protect, setRecoveryEmail);
router.delete('/recovery-email', protect, removeRecoveryEmail);
router.post('/email-change/request', verificationCodeRequestLimiter, protect, requestEmailChange);
// Confirms a pending email, recovery-email, or password change for the signed-in account.
router.post('/verification/confirm', verificationConfirmLimiter, protect, confirmVerificationCode);


module.exports = router;
