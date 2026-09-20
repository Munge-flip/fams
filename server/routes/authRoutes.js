const express = require('express');
const {
  register, login, logout, me, updateProfile, submitVerificationProfile,
  requestEmailChange, confirmVerificationCode, setRecoveryEmail, removeRecoveryEmail, changePassword,
  requestEmailVerification,
  getEmailVerificationStatus,
} = require('../controllers/authController');
const { protect, protectActivationTicket, protectConfirmation } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, me);
router.patch('/profile', protect, updateProfile);
// The beneficiary profile is only open to accounts that can sign in, so the session that
// gets here already belongs to a confirmed address.
router.patch('/verification-profile', protect, submitVerificationProfile);
// Account & security: shared by every role (see client Settings page).
router.patch('/password', protect, changePassword);
router.put('/recovery-email', protect, setRecoveryEmail);
router.delete('/recovery-email', protect, removeRecoveryEmail);
router.post('/email-change/request', protect, requestEmailChange);
// Activation runs on the ticket an unconfirmed account holds (it cannot sign in), while the
// same confirm endpoint still serves email changes for a signed-in account.
router.get('/email-verification', protectActivationTicket, getEmailVerificationStatus);
router.post('/email-verification/request', protectActivationTicket, requestEmailVerification);
router.post('/verification/confirm', protectConfirmation, confirmVerificationCode);


module.exports = router;
