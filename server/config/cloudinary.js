const { v2: cloudinary } = require('cloudinary');

const getCloudinary = () => {
  const requiredVariables = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];
  const missingVariable = requiredVariables.find((variable) => !process.env[variable]);

  if (missingVariable) {
    const error = new Error(`${missingVariable} is not configured.`);
    error.statusCode = 500;
    throw error;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return cloudinary;
};

module.exports = getCloudinary;
