const Application = require('../models/Application');
const Document = require('../models/Document');
const getCloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const { isValidObjectId, validateFileSignature } = require('../utils/validation');

const documentTypes = ['valid_id', 'certificate_of_indigency', 'grades', 'other'];

const uploadToCloudinary = (file) => new Promise((resolve, reject) => {
  const cloudinary = getCloudinary();
  const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
  const stream = cloudinary.uploader.upload_stream({ resource_type: resourceType }, (error, result) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(result);
  });

  stream.end(file.buffer);
});

const deleteCloudinaryAsset = async (publicID) => {
  const cloudinary = getCloudinary();
  const imageResult = await cloudinary.uploader.destroy(publicID, { resource_type: 'image' });

  if (imageResult.result === 'ok') {
    return;
  }

  const rawResult = await cloudinary.uploader.destroy(publicID, { resource_type: 'raw' });
  if (rawResult.result !== 'ok') {
    const error = new Error('Cloudinary asset could not be deleted.');
    error.statusCode = 502;
    throw error;
  }
};

const uploadDocument = asyncHandler(async (req, res) => {
  const { application: applicationId, docType } = req.body || {};

  if (!documentTypes.includes(docType)) {
    return res.status(400).json({ success: false, message: 'docType must be a valid document type.' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'file is required.' });
  }

  if (!validateFileSignature(req.file)) {
    return res.status(400).json({ success: false, message: 'File content does not match an allowed PDF or JPEG signature.' });
  }

  let application = null;
  if (applicationId !== undefined && applicationId !== null && applicationId !== '') {
    if (!isValidObjectId(applicationId)) {
      return res.status(400).json({ success: false, message: 'application must be a valid MongoDB ObjectId.' });
    }
    application = await Application.findOne({ _id: applicationId, applicant: req.user._id });
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
  }

  const uploadResult = await uploadToCloudinary(req.file);
  const document = await Document.create({
    application: application ? application._id : null,
    uploader: req.user._id,
    docType,
    fileURL: uploadResult.secure_url,
    publicID: uploadResult.public_id,
  });

  if (application) {
    application.documents.push(document._id);
    await application.save();
  }

  return res.status(201).json({ success: true, data: document });
});

const deleteDocument = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid document identifier.' });
  }

  const document = await Document.findOne({ _id: req.params.id, uploader: req.user._id });
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found.' });
  }

  if (document.application) {
    const application = await Application.findOne({ _id: document.application, applicant: req.user._id });
    if (!application) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    application.documents.pull(document._id);
    await application.save();
  }

  await deleteCloudinaryAsset(document.publicID);
  await document.deleteOne();

  return res.status(200).json({ success: true, data: { message: 'Document deleted successfully.' } });
});

module.exports = { deleteDocument, uploadDocument };
