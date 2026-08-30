const bcrypt = require('bcryptjs');
const User = require('../models/User');
const cookieOptions = require('../config/cookie');
const asyncHandler = require('../utils/asyncHandler');
const createToken = require('../utils/token');

const allowedFields = [
  'name', 'email', 'password', 'role', 'studentID', 'course', 'yearLevel',
  'barangay', 'contactNo', 'aidCategory', 'office', 'adminLevel',
];

const updateableProfileFields = ['name', 'studentID', 'course', 'yearLevel', 'barangay', 'contactNo', 'aidCategory'];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toSafeUser = (user) => {
  const { password, ...safeUser } = user.toObject();
  return safeUser;
};

const validateRegistration = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'A JSON object is required.';
  }

  const unexpectedField = Object.keys(body).find((field) => !allowedFields.includes(field));
  if (unexpectedField) {
    return `Unexpected field: ${unexpectedField}.`;
  }

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return 'Name is required.';
  }

  if (typeof body.email !== 'string' || !emailPattern.test(body.email.trim())) {
    return 'A valid email address is required.';
  }

  if (typeof body.password !== 'string') {
    return 'Password must be a string.';
  }
  if (body.password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(body.password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(body.password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(body.password)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(body.password)) return 'Password must contain at least one special character.';

  if (!['student', 'resident'].includes(body.role)) {
    return 'Role must be student or resident.';
  }

  if (body.studentID !== undefined && (typeof body.studentID !== 'string' || !body.studentID.trim())) {
    return 'Student ID must be a non-empty string when provided.';
  }

  if (body.yearLevel !== undefined && (!Number.isInteger(body.yearLevel) || body.yearLevel < 1)) {
    return 'Year level must be a positive whole number when provided.';
  }

  return null;
};

const register = asyncHandler(async (req, res) => {
  const validationError = validateRegistration(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const email = req.body.email.trim().toLowerCase();
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  const studentID = req.body.studentID?.trim();
  if (studentID) {
    const existingStudent = await User.findOne({ role: 'student', studentID });
    if (existingStudent) {
      return res.status(409).json({ success: false, message: 'An account with this student ID already exists.' });
    }
  }

  const password = await bcrypt.hash(req.body.password, 12);
  const user = await User.create({
    ...req.body,
    name: req.body.name.trim(),
    email,
    password,
    studentID,
  });

  const token = createToken(user);
  res.cookie('fams_token', token, cookieOptions());
  return res.status(201).json({ success: true, data: toSafeUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body || {};
  if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ success: false, message: 'Email or Student ID and password are required.' });
  }

  const normalizedIdentifier = identifier.trim();
  const matchingUsers = await User.find({
    $or: [
      { email: normalizedIdentifier.toLowerCase() },
      { role: 'student', studentID: normalizedIdentifier },
    ],
  }).select('+password').limit(2);

  if (matchingUsers.length > 1) {
    return res.status(400).json({ success: false, message: 'Email or Student ID is ambiguous. Contact an administrator.' });
  }

  const user = matchingUsers[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or student ID, or password.' });
  }

  const token = createToken(user);
  res.cookie('fams_token', token, cookieOptions());
  return res.status(200).json({ success: true, data: toSafeUser(user) });
});

const logout = (req, res) => {
  const options = cookieOptions();
  delete options.maxAge;
  res.clearCookie('fams_token', options);
  return res.status(200).json({ success: true, data: { message: 'Logged out successfully.' } });
};

const me = (req, res) => res.status(200).json({ success: true, data: toSafeUser(req.user) });

const updateProfile = asyncHandler(async (req, res) => {

  const invalidField = Object.keys(body).find((field) => !updateableProfileFields.includes(field));
  if (invalidField) {
    return res.status(400).json({ success: false, message: `Cannot update field: ${invalidField}.` });
  }

  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }


  Object.keys(body).forEach((field) => {
    user[field] = body[field];
  });

  if (user.verificationStatus === 'needs_correction') {
    user.verificationStatus = 'pending';
  }


  res.status(200).json({ success: true, data: toSafeUser(user) });
});

module.exports = { register, login, logout, me, updateProfile };
