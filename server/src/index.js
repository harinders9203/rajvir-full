import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { connect, db } from './db.js';
import authRoutes from './routes/auth.js';
import designRoutes from './routes/designs.js';
import appointmentRoutes from './routes/appointments.js';
import availabilityRoutes from './routes/availability.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import settingsRoutes from './routes/settings.js';
import contactRoutes from './routes/contact.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

app.get('/api/health', (req, res) =>
  res.json({ ok: true, service: 'blush-api', database: db ? db.databaseName : 'connecting' })
);

app.use('/api/auth', authRoutes);
app.use('/api', designRoutes);        // /nail-designs, /design-categories
app.use('/api', availabilityRoutes);  // /availability
app.use('/api', appointmentRoutes);   // /appointments
app.use('/api', notificationRoutes);  // /notifications
app.use('/api', settingsRoutes);      // /settings
app.use('/api', contactRoutes);       // /contact
app.use('/api/admin', adminRoutes);   // /admin/*

app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const message =
    err.code === 'LIMIT_FILE_SIZE'
      ? 'Image is too large (max 5 MB).'
      : err.status === 413
      ? 'Image is too large (max 5 MB).'
      : err.message || 'Something went wrong on the server.';
  res.status(status).json({ error: message });
});

// Serve the built client in production (single-origin deployment).
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// The sandbox environment sets PORT=0 globally; treat that as "unset" so the
// server binds to the intended default port.
const PORT = process.env.PORT && process.env.PORT !== '0' ? Number(process.env.PORT) : 4000;

async function start() {
  try {
    await connect();
  } catch (err) {
    console.error('✗ Could not connect to MongoDB Atlas:', err.message);
    console.error('  Check MONGODB_URI / credentials in server/.env and that your IP is on the Atlas access list.');
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`✿ Blush Nail Studio API listening on http://localhost:${PORT}`);
    console.log(`  MongoDB: ${db.databaseName} @ cluster0.xhqrqbs.mongodb.net`);
    console.log(`  Health check: http://localhost:${PORT}/api/health`);
  });
}

start();
