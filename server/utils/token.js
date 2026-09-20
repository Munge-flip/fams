const jwt = require('jsonwebtoken');
const { VERIFICATION_TICKET_MINUTES } = require('../config/cookie');

const secret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Copy .env.example to .env and set JWT_SECRET.');
  }

  return process.env.JWT_SECRET;
};

// Session token for a confirmed account, including administrators.
const createToken = (user) => jwt.sign(
  { id: user._id.toString(), role: user.role, name: user.name },
  secret(),
  { expiresIn: process.env.JWT_EXPIRE || '7d' },
);

// Ticket for an account that still owes an email confirmation. It carries the same identity
// claims in its own cookie plus an explicit purpose, so the two credentials can never be
// swapped for one another: a ticket must never open an authenticated page.
const createVerificationTicket = (user) => jwt.sign(
  { id: user._id.toString(), role: user.role, name: user.name, purpose: 'email_verification' },
  secret(),
  { expiresIn: `${VERIFICATION_TICKET_MINUTES}m` },
);

module.exports = { createToken, createVerificationTicket };
