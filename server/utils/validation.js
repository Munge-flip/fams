const dns = require('dns');
const mongoose = require('mongoose');

const isValidObjectId = (value) => typeof value === 'string' && mongoose.isValidObjectId(value);

const isPlainObject = (value) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const isValidDate = (value) => {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
};

// An address is checked in two steps, shared by registration and every flow that moves a
// code to a new address, so all of them reject the same input the same way and never spend
// a verification send on an address that cannot receive it.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_FORMAT_MESSAGE = "That doesn't look like a valid email address.";
const EMAIL_DOMAIN_MESSAGE = "We couldn't find that email domain. Please use a real, working email address.";

// Returns the message to show the user, or null when the value is acceptable.
const validateEmailFormat = (value) => (
  typeof value === 'string' && EMAIL_PATTERN.test(value.trim()) ? null : EMAIL_FORMAT_MESSAGE
);

const emailDomainOf = (value) => (
  typeof value === 'string' ? value.trim().toLowerCase().split('@')[1] || '' : ''
);

// A domain can receive mail only when it publishes a real mail exchanger, so the lookup is
// the second half of validation. A null MX record (RFC 7505, `MX 0 .`) is a domain stating
// it accepts no mail and fails here too; a resolver that cannot answer at all is treated as
// inconclusive rather than as a bad address, because a flaky lookup must not block signups.
const validateEmailDomain = async (value) => {
  const domain = emailDomainOf(value);
  if (!domain) return EMAIL_FORMAT_MESSAGE;

  let records;
  try {
    records = await dns.promises.resolveMx(domain);
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') return EMAIL_DOMAIN_MESSAGE;

    console.error(`Unable to look up MX records for ${domain}: ${error.message}`);
    return null;
  }

  return records.some((record) => record.exchange) ? null : EMAIL_DOMAIN_MESSAGE;
};

const validateFileSignature = (file) => {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    return false;
  }

  if (file.mimetype === 'application/pdf') {
    return file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }

  if (file.mimetype === 'image/jpeg') {
    return file.buffer.length >= 3
      && file.buffer[0] === 0xff
      && file.buffer[1] === 0xd8
      && file.buffer[2] === 0xff;
  }

  return false;
};

module.exports = {
  isPlainObject,
  isValidDate,
  isValidObjectId,
  validateEmailDomain,
  validateEmailFormat,
  validateFileSignature,
};
