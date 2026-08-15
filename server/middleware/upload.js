const path = require('path');
const multer = require('multer');

const allowedFiles = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedFiles[extension] !== file.mimetype) {
      const error = new Error('Only PDF and JPEG files with matching MIME types and extensions are allowed.');
      error.statusCode = 400;
      return callback(error);
    }

    return callback(null, true);
  },
});

module.exports = upload;
