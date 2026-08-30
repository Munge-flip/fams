const express = require('express');
const { register, login, logout, me, updateProfile, submitVerificationProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, me);
router.patch('/profile', protect, updateProfile);
router.patch('/verification-profile', protect, submitVerificationProfile);


module.exports = router;
