const User = require('../models/User');
const AidProgram = require('../models/AidProgram');
const Application = require('../models/Application');
const asyncHandler = require('../utils/asyncHandler');
const { slotOccupyingStatuses } = require('../utils/applicationStatus');
const { isValidObjectId } = require('../utils/validation');

const beneficiaryRoles = ['student', 'resident'];
const verificationStatuses = ['verified', 'needs_correction'];

const toSafeUser = (user) => {
  const { password, ...safeUser } = user.toObject();
  return safeUser;
};

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $in: beneficiaryRoles } })
    .sort({ createdAt: -1 })
    .select('-password');

  return res.status(200).json({ success: true, data: users });
});

const getUser = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid user identifier.' });
  }

  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  return res.status(200).json({ success: true, data: toSafeUser(user) });
});

const verifyUser = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid user identifier.' });
  }

  const { status, remarks } = req.body || {};
  if (!verificationStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid verification status.' });
  }

  if (status === 'needs_correction' && (typeof remarks !== 'string' || !remarks.trim())) {
    return res.status(400).json({ success: false, message: 'Remarks are required when requesting profile correction.' });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  user.verificationStatus = status;
  user.verificationRemarks = typeof remarks === 'string' ? remarks.trim() : '';
  await user.save();

  return res.status(200).json({ success: true, data: toSafeUser(user) });
});

const listProgramBeneficiaries = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid program identifier.' });
  }

  const program = await AidProgram.findById(req.params.id);
  if (!program) {
    return res.status(404).json({ success: false, message: 'Aid program not found.' });
  }

  // Accepted beneficiaries hold a slot, so the list uses the same status set as the
  // slot count: released beneficiaries stay listed after their assistance is released.
  // Most recent approval first. `updatedAt` is the closest reliable field: it is stamped
  // by every status change because the model has no dedicated `approvedAt` (release and
  // undo refresh it too), and rows never status-changed fall back to submission order.
  const beneficiaries = await Application.find({ program: program._id, status: { $in: slotOccupyingStatuses } })
    .sort({ updatedAt: -1, submittedAt: -1 })
    .populate('applicant', 'name email studentID barangay contactNo');

  return res.status(200).json({ success: true, data: { program, beneficiaries } });
});

module.exports = { getUser, listProgramBeneficiaries, listUsers, verifyUser };
