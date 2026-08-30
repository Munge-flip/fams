const express = require('express');
const { getUser, listUsers, verifyUser } = require('../controllers/adminController');
const { authorize, protect } = require('../middleware/auth');

const router = express.Router();

router.get('/users', protect, authorize('admin'), listUsers);
router.get('/users/:id', protect, authorize('admin'), getUser);
router.patch('/users/:id/verify', protect, authorize('admin'), verifyUser);

module.exports = router;
