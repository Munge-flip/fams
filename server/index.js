const dns = require('dns');

// Render's network cannot route outbound IPv6, so prefer IPv4 DNS results for the whole
// process. Without this, Gmail's SMTP host resolves to IPv6 first and sends hang for
// minutes before failing with ENETUNREACH. This changes only preference order, not
// availability; MongoDB Atlas and Cloudinary keep working over whichever family resolves.
dns.setDefaultResultOrder('ipv4first');

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
