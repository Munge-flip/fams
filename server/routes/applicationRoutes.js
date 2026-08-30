const express = require('express');
const {
  cancelApplication,
  createApplication,
  getApplication,
  listApplications,
  updateApplicationStatus,
  updateReleaseAmount,
} = require('../controllers/applicationController');
const { authorize, protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, listApplications);
router.get('/:id', protect, getApplication);
router.post('/', protect, authorize('student', 'resident'), createApplication);
router.put('/:id/status', protect, authorize('admin'), updateApplicationStatus);
router.patch('/:id/release-amount', protect, authorize('admin'), updateReleaseAmount);

module.exports = router;
