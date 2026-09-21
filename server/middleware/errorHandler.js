const multer = require('multer');

const errorHandler = (error, req, res, next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Each uploaded file must be 5 MB or smaller.' });
    }

    return res.status(400).json({ success: false, message: error.message });
  }

  // A malformed JSON body arrives as the parser's own SyntaxError, tagged `entity.parse.failed`
  // and already carrying statusCode 400. Its raw wording is replaced with a sentence a person can
  // act on, which is why this runs before the statusCode branch below: that branch would answer
  // with the parser's text instead. The tag keeps the other parser errors — a too-large body
  // (413), an unsupported charset (415), a failed verify hook (403) — on their own paths.
  if (error instanceof SyntaxError && error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON request body.' });
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: error.message });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid resource identifier.' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: 'A user with that value already exists.' });
  }

  return res.status(500).json({ success: false, message: 'Internal server error.' });
};

module.exports = errorHandler;
