const express = require('express');
const {
  cancelApplication,
  createApplication,
  getApplication,
  listApplications,
  updateApplicationStatus,
} = require('../controllers/applicationController');
const { authorize, protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, listApplications);
router.get('/:id', protect, getApplication);
router.post('/', protect, authorize('student', 'resident'), createApplication);
router.put('/:id/status', protect, authorize('admin'), updateApplicationStatus);
router.delete('/:id', protect, authorize('student', 'resident'), cancelApplication);

module.exports = router;
