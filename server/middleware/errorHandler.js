const errorHandler = (error, req, res, next) => {
  console.error(error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: error.message });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid resource identifier.' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: 'A user with that value already exists.' });
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ success: false, message: 'Invalid JSON request body.' });
  }

  return res.status(500).json({ success: false, message: 'Internal server error.' });
};

module.exports = errorHandler;
