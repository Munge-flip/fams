const express = require('express');
const {
  register, login, logout, me, updateProfile, submitVerificationProfile,
  changeEmail, setRecoveryEmail, removeRecoveryEmail, changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimit');

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
// Account & security: shared by every role (see client Settings page). Each change is applied
// on the same request after the current password is verified.
router.patch('/email', protect, changeEmail);
router.patch('/password', protect, changePassword);
router.put('/recovery-email', protect, setRecoveryEmail);
router.delete('/recovery-email', protect, removeRecoveryEmail);

module.exports = router;
