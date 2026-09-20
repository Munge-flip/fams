const express = require('express');
const { getUser, listProgramBeneficiaries, listUsers, verifyUser } = require('../controllers/adminController');
const { changeEmail, changePassword } = require('../controllers/authController');
const { authorize, protect } = require('../middleware/auth');

const router = express.Router();

router.get('/users', protect, authorize('admin'), listUsers);
router.get('/users/:id', protect, authorize('admin'), getUser);
router.patch('/users/:id/verify', protect, authorize('admin'), verifyUser);
router.get('/programs/:id/beneficiaries', protect, authorize('admin'), listProgramBeneficiaries);
router.patch('/account/email', protect, authorize('admin'), changeEmail);
router.patch('/account/password', protect, authorize('admin'), changePassword);

module.exports = router;
