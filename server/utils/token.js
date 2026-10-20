const jwt = require('jsonwebtoken');

const secret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Copy .env.example to .env and set JWT_SECRET.');
  }

  return process.env.JWT_SECRET;
};

// Session token for every signed-in account, including administrators.
const createToken = (user) => jwt.sign(
  { id: user._id.toString(), role: user.role, name: user.name },
  secret(),
  { expiresIn: process.env.JWT_EXPIRE || '7d' },
);

module.exports = { createToken };
