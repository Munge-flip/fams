const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const connectDB = require('./config/db');
const validateEnvironment = require('./config/env');

const port = Number(process.env.PORT || 5000);

const startServer = async () => {
  try {
    validateEnvironment();
    await connectDB();
    app.listen(port, () => {
      console.log(`FAMS API listening on port ${port}`);
    });
  } catch (error) {
    console.error(`Unable to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
