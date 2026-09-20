const express = require('express');
const { deleteDocument, uploadDocument } = require('../controllers/documentController');
const { authorize, protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Documents only exist to support an application, so uploading and removing them needs a
// confirmed account — which every beneficiary session already is.
router.post('/upload', protect, authorize('student', 'resident'), upload.single('file'), uploadDocument);
router.delete('/:id', protect, authorize('student', 'resident'), deleteDocument);

module.exports = router;
