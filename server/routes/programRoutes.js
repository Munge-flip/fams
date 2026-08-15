const express = require('express');
const {
  createProgram,
  deleteProgram,
  getProgram,
  listPrograms,
  updateProgram,
} = require('../controllers/programController');
const { authorize, protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', listPrograms);
router.get('/:id', getProgram);
router.post('/', protect, authorize('admin'), createProgram);
router.put('/:id', protect, authorize('admin'), updateProgram);
router.delete('/:id', protect, authorize('admin'), deleteProgram);

module.exports = router;
