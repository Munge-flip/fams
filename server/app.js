const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const programRoutes = require('./routes/programRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const documentRoutes = require('./routes/documentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// TLS ends at the host's reverse proxy (Render), so the caller's address only reaches Express
// through X-Forwarded-For. Trusting exactly one hop makes req.ip — and therefore every per-IP
// rate limit — read the real client instead of the proxy, without trusting anything the client
// could have written into the header itself.
app.set('trust proxy', 1);

// Security headers on every response. The library defaults are kept as they are: the browser
// client loads nothing from this origin except JSON (uploaded files are served by Cloudinary),
// so no directive has to be relaxed and none is disabled.
app.use(helmet());

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use(errorHandler);

module.exports = app;
