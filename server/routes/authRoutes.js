const express = require('express');
const {
  register, login, logout, me, updateProfile, submitVerificationProfile,
  requestEmailChange, confirmVerificationCode, setRecoveryEmail, removeRecoveryEmail, changePassword,
  requestEmailVerification,
  getEmailVerificationStatus,
} = require('../controllers/authController');
const { protect, protectActivationTicket, protectConfirmation } = require('../middleware/auth');
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
// The beneficiary profile is only open to accounts that can sign in, so the session that
// gets here already belongs to a confirmed address.
router.patch('/verification-profile', protect, submitVerificationProfile);
// Account & security: shared by every role (see client Settings page). Everything below that
// mails a 6-digit code draws on one shared hourly allowance per address.
router.patch('/password', verificationCodeRequestLimiter, protect, changePassword);
router.put('/recovery-email', verificationCodeRequestLimiter, protect, setRecoveryEmail);
router.delete('/recovery-email', protect, removeRecoveryEmail);
router.post('/email-change/request', verificationCodeRequestLimiter, protect, requestEmailChange);
// Activation runs on the ticket an unconfirmed account holds (it cannot sign in), while the
// same confirm endpoint still serves email changes for a signed-in account.
router.get('/email-verification', protectActivationTicket, getEmailVerificationStatus);
router.post('/email-verification/request', verificationCodeRequestLimiter, protectActivationTicket, requestEmailVerification);
router.post('/verification/confirm', verificationConfirmLimiter, protectConfirmation, confirmVerificationCode);


module.exports = router;
