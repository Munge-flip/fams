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

module.exports = { isPlainObject, isValidDate, isValidObjectId, validateFileSignature };
