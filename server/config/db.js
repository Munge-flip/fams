const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not configured. Copy .env.example to .env and set MONGO_URI.');
  }

  const connection = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`MongoDB connected: ${connection.connection.host}`);
};

module.exports = connectDB;
