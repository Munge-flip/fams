const validateEnvironment = () => {
  if (!process.env.MONGO_URI || !process.env.MONGO_URI.trim()) {
    throw new Error('MONGO_URI is not configured. Copy .env.example to .env and set MONGO_URI.');
  }

  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    throw new Error('JWT_SECRET is not configured. Copy .env.example to .env and set JWT_SECRET.');
  }

  if (process.env.JWT_SECRET === 'replace_with_a_long_random_secret') {
    throw new Error('JWT_SECRET must be replaced with a real secret before starting the server.');
  }
};

module.exports = validateEnvironment;
