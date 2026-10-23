const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// The web client authenticates with the httpOnly cookie. The Capacitor app cannot rely on a
// cross-site cookie inside the Android WebView, so it sends the same JWT as a bearer token.
// When both are present the header wins, which keeps an explicit native credential from being
// silently ignored in favour of a stale cookie.
const readToken = (req) => {
  const authorization = req.headers.authorization;

  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    return match ? match[1].trim() : null;
  }

  return req.cookies.fams_token;
};

const protect = asyncHandler(async (req, res, next) => {
  const token = readToken(req);

  if (!token) {
    // No credential at all keeps today's message. A header that is present but is not a
    // usable bearer credential is an authentication failure, like any other bad token.
    const message = req.headers.authorization
      ? 'Authentication token is invalid or expired.'
      : 'Authentication is required.';

    return res.status(401).json({ success: false, message });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ success: false, message: 'JWT_SECRET is not configured.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'The authenticated user no longer exists.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Authentication token is invalid or expired.' });
  }
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
  }

  next();
};

module.exports = { protect, authorize };
