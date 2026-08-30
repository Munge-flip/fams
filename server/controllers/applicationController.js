const AidProgram = require('../models/AidProgram');
const Application = require('../models/Application');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { isPlainObject, isValidDate, isValidObjectId } = require('../utils/validation');

const applicationFields = ['program', 'personalInfo'];
const personalInfoFields = ['fullName', 'address', 'contactNo', 'birthdate'];
const statuses = ['submitted', 'under_review', 'approved', 'denied', 'cash_released'];
const transitions = {
  submitted: ['under_review'],
  under_review: ['approved', 'denied'],
  approved: ['cash_released'],
  denied: [],
  cash_released: [],
};

const applicationPopulation = [
  { path: 'applicant', select: 'name email role studentID barangay contactNo' },
  { path: 'program' },
  { path: 'documents' },
];

const validatePersonalInfo = (personalInfo) => {
  if (!isPlainObject(personalInfo)) {
    return 'personalInfo must be a valid object.';
  }

  const unexpectedField = Object.keys(personalInfo).find((field) => !personalInfoFields.includes(field));
  if (unexpectedField) {
    return `Unexpected personalInfo field: ${unexpectedField}.`;
  }

  for (const field of ['fullName', 'address', 'contactNo']) {
    if (personalInfo[field] !== undefined && typeof personalInfo[field] !== 'string') {
      return `personalInfo.${field} must be a string when provided.`;
    }
  }

  if (personalInfo.birthdate !== undefined && !isValidDate(personalInfo.birthdate)) {
    return 'personalInfo.birthdate must be a valid date when provided.';
  }

  return null;
};

const normalizePersonalInfo = (personalInfo) => {
  const normalized = { ...personalInfo };

  for (const field of ['fullName', 'address', 'contactNo']) {
    if (normalized[field] !== undefined) {
      normalized[field] = normalized[field].trim();
    }
  }

  if (normalized.birthdate !== undefined) {
    normalized.birthdate = new Date(normalized.birthdate);
  }

  return normalized;
};

const getApplicationForUser = async (id, user) => {
  const query = user.role === 'admin' ? { _id: id } : { _id: id, applicant: user._id };
  return Application.findOne(query).populate(applicationPopulation);
};

const listApplications = asyncHandler(async (req, res) => {
  const query = req.user.role === 'admin' ? {} : { applicant: req.user._id };
  const applications = await Application.find(query).populate(applicationPopulation);
  return res.status(200).json({ success: true, data: applications });
});

const getApplication = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid application identifier.' });
  }

  const application = await getApplicationForUser(req.params.id, req.user);
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found.' });
  }

  return res.status(200).json({ success: true, data: application });
});

const createApplication = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: 'A JSON object is required.' });
  }

  const unexpectedField = Object.keys(req.body).find((field) => !applicationFields.includes(field));
  if (unexpectedField) {
    return res.status(400).json({ success: false, message: `Unexpected field: ${unexpectedField}.` });
  }

  if (!isValidObjectId(req.body.program)) {
    return res.status(400).json({ success: false, message: 'program must be a valid MongoDB ObjectId.' });
  }

  const personalInfoError = validatePersonalInfo(req.body.personalInfo);
  if (personalInfoError) {
    return res.status(400).json({ success: false, message: personalInfoError });
  }

  const program = await AidProgram.findById(req.body.program);
  if (!program) {
    return res.status(404).json({ success: false, message: 'Aid program not found.' });
  }

  if (program.status !== 'active') {
    return res.status(400).json({ success: false, message: 'Applications are not accepted for this program.' });
  }

  if (program.deadline.getTime() < Date.now()) {
    return res.status(400).json({ success: false, message: 'The program deadline has passed.' });
  }

  const applicationCount = await Application.countDocuments({ program: program._id });
  if (program.slots === 0 || applicationCount >= program.slots) {
    return res.status(409).json({ success: false, message: 'This program has reached its application capacity.' });
  }

  const application = await Application.create({
    applicant: req.user._id,
    program: program._id,
    personalInfo: normalizePersonalInfo(req.body.personalInfo),
  });
  await application.populate(applicationPopulation);

  return res.status(201).json({ success: true, data: application });
});

const updateApplicationStatus = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid application identifier.' });
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: 'A JSON object is required.' });
  }

  const allowedFields = ['status', 'remarks'];
  const unexpectedField = Object.keys(req.body).find((field) => !allowedFields.includes(field));
  if (unexpectedField) {
    return res.status(400).json({ success: false, message: `Unexpected field: ${unexpectedField}.` });
  }

  if (!statuses.includes(req.body.status)) {
    return res.status(400).json({ success: false, message: 'status must be a valid application status.' });
  }

  if (req.body.remarks !== undefined && typeof req.body.remarks !== 'string') {
    return res.status(400).json({ success: false, message: 'remarks must be a string when provided.' });
  }

  const application = await Application.findById(req.params.id);
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found.' });
  }

  if (application.status !== req.body.status && !transitions[application.status].includes(req.body.status)) {
    return res.status(400).json({ success: false, message: 'Invalid application status transition.' });
  }

  application.status = req.body.status;
  if (req.body.remarks !== undefined) {
    application.remarks = req.body.remarks;
  }
  application.updatedAt = new Date();
  await application.save();
  await application.populate(applicationPopulation);

  return res.status(200).json({ success: true, data: application });
});

const cancelApplication = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid application identifier.' });
  }

  const application = await Application.findOne({ _id: req.params.id, applicant: req.user._id });
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found.' });
  }

  if (application.status !== 'submitted') {
    return res.status(400).json({ success: false, message: 'Only submitted applications can be cancelled.' });
  }

  await application.deleteOne();
  return res.status(200).json({ success: true, data: { message: 'Application cancelled successfully.' } });
});

const updateReleaseAmount = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid application identifier.' });
  }

  const { amount } = req.body || {};
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ success: false, message: 'Release amount must be a non-negative number.' });
  }

  const application = await Application.findById(req.params.id);
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found.' });
  }

  application.releaseDetails = {
    ...application.releaseDetails,
    amount: Math.round(amount * 100) / 100,
  };
  await application.save();

  return res.status(200).json({ success: true, data: application });
});

module.exports = {
  cancelApplication,
  createApplication,
  getApplication,
  listApplications,
  updateApplicationStatus,
  updateReleaseAmount,
};
