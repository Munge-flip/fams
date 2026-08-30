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
    user.verificationRemarks = '';
  }


});

const verificationProfileFields = [
  'name', 'dateOfBirth', 'contactNo', 'address', 'barangay',
  'studentID', 'course', 'yearLevel', 'school', 'email',
  'father', 'mother', 'household',
];

const parentKeys = ['fullName', 'dob', 'contact', 'occupation', 'employmentStatus', 'monthlyIncomeRange'];
const householdKeys = ['memberCount', 'dependentsCount', 'currentlyStudyingCount', 'monthlyIncomeRange', 'primaryIncomeSource', 'secondaryIncomeSource'];
const employmentStatuses = ['employed', 'unemployed', 'working_abroad', 'unknown', 'deceased', 'na'];
const incomeRanges = ['Below ₱10,000', '₱10,000–₱19,999', '₱20,000–₱29,999', '₱30,000–₱39,999', '₱40,000 or more'];
const contactPattern = /^[+]?[\d\s()-]{7,15}$/;

const isNotFutureDate = (value) => {
  if (typeof value !== 'string' && !(value instanceof Date)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
};

const validateVerificationPayload = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'A JSON object is required.';
  }

  const unexpectedField = Object.keys(body).find((field) => !verificationProfileFields.includes(field));
  if (unexpectedField) {
    return `Unexpected field: ${unexpectedField}.`;
  }

  const required = ['name', 'dateOfBirth', 'contactNo', 'address', 'barangay', 'studentID', 'course', 'yearLevel', 'school'];
  const missing = required.find((field) => !String(body[field] ?? '').trim());
  if (missing) {
    return 'Please provide all required personal and student information.';
  }

  if (!isNotFutureDate(body.dateOfBirth)) {
    return 'Date of birth must be a valid date and cannot be in the future.';
  }

  if (!Number.isInteger(Number(body.yearLevel)) || Number(body.yearLevel) < 1) {
    return 'Year level must be a positive whole number.';
  }

  if (!contactPattern.test(String(body.contactNo).trim())) {
    return 'Contact number looks invalid. Use digits only, optionally starting with +63.';
  }

  ['father', 'mother'].forEach((parentKey) => {
    const parent = body[parentKey];
    if (parent === undefined) return;
    if (!parent || typeof parent !== 'object' || Array.isArray(parent)) {
      throw new Error(`${parentKey} must be an object.`);
    }
    const invalidKey = Object.keys(parent).find((key) => !parentKeys.includes(key));
    if (invalidKey) {
      throw new Error(`Unexpected field: ${parentKey}.${invalidKey}.`);
    }
    if (parent.employmentStatus !== undefined && parent.employmentStatus !== '' && !employmentStatuses.includes(parent.employmentStatus)) {
      throw new Error(`Invalid employment status for ${parentKey}.`);
    }
    if (parent.dob !== undefined && parent.dob !== null && parent.dob !== '' && !isNotFutureDate(parent.dob)) {
      throw new Error(`${parentKey}.dob must be a valid date and cannot be in the future.`);
    }
    if (parent.monthlyIncomeRange !== undefined && parent.monthlyIncomeRange !== '' && !incomeRanges.includes(parent.monthlyIncomeRange)) {
      throw new Error(`Invalid income range for ${parentKey}.`);
    }
  });

  const household = body.household;
  if (household !== undefined) {
    if (!household || typeof household !== 'object' || Array.isArray(household)) {
      throw new Error('household must be an object.');
    }
    const invalidKey = Object.keys(household).find((key) => !householdKeys.includes(key));
    if (invalidKey) {
      throw new Error(`Unexpected field: household.${invalidKey}.`);
    }
    if (household.memberCount !== undefined && (!Number.isInteger(Number(household.memberCount)) || Number(household.memberCount) < 1)) {
      throw new Error('Household member count must be a positive whole number.');
    }
    ['dependentsCount', 'currentlyStudyingCount'].forEach((field) => {
      if (household[field] !== undefined && (!Number.isInteger(Number(household[field])) || Number(household[field]) < 0)) {
        throw new Error(`${field} must be a non-negative whole number.`);
      }
    });
    if (household.monthlyIncomeRange !== undefined && household.monthlyIncomeRange !== '' && !incomeRanges.includes(household.monthlyIncomeRange)) {
      throw new Error('Invalid household income range.');
    }
  }

  return null;
};

const cleanParentFields = (parent) => {
  if (!parent || typeof parent !== 'object' || Array.isArray(parent)) {
    return {};
  }
  const cleaned = {};
  Object.keys(parent).forEach((key) => {
    if (parent[key] !== '') {
      cleaned[key] = parent[key];
    }
  });
  return cleaned;
};

const submitVerificationProfile = asyncHandler(async (req, res) => {
  const user = req.user;

  let validationError;
  try {
    validationError = validateVerificationPayload(req.body);
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const { name, dateOfBirth, contactNo, address, barangay, studentID, course, yearLevel, school, father, mother, household } = req.body;

  user.name = String(name).trim();
  user.dateOfBirth = dateOfBirth;
  user.contactNo = String(contactNo).trim();
  user.address = String(address).trim();
  user.barangay = String(barangay).trim();
  user.studentID = String(studentID).trim();
  user.course = String(course).trim();
  user.yearLevel = Number(yearLevel);
  user.school = String(school).trim();
  user.father = cleanParentFields(father);
  user.mother = cleanParentFields(mother);
  user.household = household || {};

  if (user.verificationStatus === 'incomplete' || user.verificationStatus === 'needs_correction') {
    user.verificationStatus = 'pending';
    user.verificationRemarks = '';
  }

  await user.save();
  res.status(200).json({ success: true, data: toSafeUser(user) });
});

module.exports = { register, login, logout, me, updateProfile, submitVerificationProfile };
