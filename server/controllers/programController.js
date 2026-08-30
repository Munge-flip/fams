const AidProgram = require('../models/AidProgram');
const Application = require('../models/Application');
const asyncHandler = require('../utils/asyncHandler');
const { isValidDate, isValidObjectId } = require('../utils/validation');

const programFields = ['title', 'description', 'eligibility', 'slots', 'deadline', 'category', 'status', 'releaseDetails'];
const categories = ['scholarship', 'barangay', 'emergency'];
const statuses = ['active', 'closed'];
const releaseDetailsFields = ['date', 'timeStart', 'timeEnd', 'location', 'instructions'];
const timePattern = /^\d{2}:\d{2}$/;

const validateReleaseDetails = (releaseDetails) => {
  if (releaseDetails === null || releaseDetails === undefined) {
    return null;
  }
  if (typeof releaseDetails !== 'object' || Array.isArray(releaseDetails)) {
    return 'releaseDetails must be an object.';
  }

  const unexpectedField = Object.keys(releaseDetails).find((field) => !releaseDetailsFields.includes(field));
  if (unexpectedField) {
    return `Unexpected releaseDetails field: ${unexpectedField}.`;
  }

  if (!isValidDate(releaseDetails.date)) {
    return 'Release date must be a valid date.';
  }
  if (typeof releaseDetails.timeStart !== 'string' || !timePattern.test(releaseDetails.timeStart)) {
    return 'Release start time must be a valid time (HH:MM).';
  }
  if (typeof releaseDetails.timeEnd !== 'string' || !timePattern.test(releaseDetails.timeEnd)) {
    return 'Release end time must be a valid time (HH:MM).';
  }
  if (releaseDetails.timeEnd < releaseDetails.timeStart) {
    return 'Release end time cannot be earlier than the start time.';
  }
  if (typeof releaseDetails.location !== 'string' || !releaseDetails.location.trim()) {
    return 'Release location must be a non-empty string.';
  }
  if (releaseDetails.instructions !== undefined && typeof releaseDetails.instructions !== 'string') {
    return 'Release instructions must be a string when provided.';
  }

  return null;
};

const validateProgram = (body, partial = false) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'A JSON object is required.';
  }

  const unexpectedField = Object.keys(body).find((field) => !programFields.includes(field));
  if (unexpectedField) {
    return `Unexpected field: ${unexpectedField}.`;
  }

  if (partial && Object.keys(body).length === 0) {
    return 'At least one program field is required.';
  }

  for (const field of ['title', 'description', 'eligibility']) {
    if ((!partial || body[field] !== undefined) && (typeof body[field] !== 'string' || !body[field].trim())) {
      return `${field} must be a non-empty string.`;
    }
  }

  if ((!partial || body.slots !== undefined) && (!Number.isInteger(body.slots) || body.slots < 0)) {
    return 'slots must be an integer greater than or equal to 0.';
  }

  if ((!partial || body.deadline !== undefined) && !isValidDate(body.deadline)) {
    return 'deadline must be a valid date.';
  }

  if ((!partial || body.category !== undefined) && !categories.includes(body.category)) {
    return 'category must be scholarship, barangay, or emergency.';
  }

  if ((!partial || body.status !== undefined) && !statuses.includes(body.status)) {
    return 'status must be active or closed.';
  }

  if (body.releaseDetails !== undefined) {
    const releaseDetailsError = validateReleaseDetails(body.releaseDetails);
    if (releaseDetailsError) {
      return releaseDetailsError;
    }
  }

  return null;
};

const normalizeProgramFields = (body) => {
  const normalized = { ...body };

  for (const field of ['title', 'description', 'eligibility']) {
    if (normalized[field] !== undefined) {
      normalized[field] = normalized[field].trim();
    }
  }

  if (normalized.deadline !== undefined) {
    normalized.deadline = new Date(normalized.deadline);
  }

  if (normalized.releaseDetails !== undefined && normalized.releaseDetails !== null) {
    const release = normalized.releaseDetails;
    const hasSchedule = Boolean(release.date) || Boolean(String(release.timeStart || '').trim()) || Boolean(String(release.timeEnd || '').trim()) || Boolean(String(release.location || '').trim()) || Boolean(String(release.instructions || '').trim());

    if (!hasSchedule) {
      delete normalized.releaseDetails;
    } else {
      normalized.releaseDetails = {
        date: new Date(release.date),
        timeStart: String(release.timeStart).trim(),
        timeEnd: String(release.timeEnd).trim(),
        location: String(release.location).trim(),
        instructions: release.instructions !== undefined ? String(release.instructions).trim() : '',
      };
    }
  }

  return normalized;
};

const listPrograms = asyncHandler(async (req, res) => {
  const programs = await AidProgram.find({ status: 'active' });
  return res.status(200).json({ success: true, data: programs });
});

const getProgram = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid program identifier.' });
  }

  const program = await AidProgram.findById(req.params.id);
  if (!program) {
    return res.status(404).json({ success: false, message: 'Aid program not found.' });
  }

  return res.status(200).json({ success: true, data: program });
});

const createProgram = asyncHandler(async (req, res) => {
  const validationError = validateProgram(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const program = await AidProgram.create({
    ...normalizeProgramFields(req.body),
    createdBy: req.user._id,
  });

  return res.status(201).json({ success: true, data: program });
});

const updateProgram = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid program identifier.' });
  }

  const validationError = validateProgram(req.body, true);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const program = await AidProgram.findByIdAndUpdate(
    req.params.id,
    normalizeProgramFields(req.body),
    { new: true, runValidators: true },
  );

  if (!program) {
    return res.status(404).json({ success: false, message: 'Aid program not found.' });
  }

  return res.status(200).json({ success: true, data: program });
});

const deleteProgram = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid program identifier.' });
  }

  const program = await AidProgram.findById(req.params.id);
  if (!program) {
    return res.status(404).json({ success: false, message: 'Aid program not found.' });
  }

  const applicationCount = await Application.countDocuments({ program: program._id });
  if (applicationCount > 0) {
    return res.status(409).json({ success: false, message: 'Programs with applications cannot be deleted.' });
  }

  await program.deleteOne();
  return res.status(200).json({ success: true, data: { message: 'Aid program deleted successfully.' } });
});

module.exports = { createProgram, deleteProgram, getProgram, listPrograms, updateProgram };
