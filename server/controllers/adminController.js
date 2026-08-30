const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
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

module.exports = { getUser, listUsers, verifyUser };
