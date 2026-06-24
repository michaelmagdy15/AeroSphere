// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Cloud Profiles API Server
// ═══════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import profileRoutes from './routes/profiles';
import authRoutes from './routes/auth';

// ── Firebase Admin init ──
// Uses GOOGLE_APPLICATION_CREDENTIALS env or Cloud Run's default service account
initializeApp({ credential: applicationDefault() });

const app = express();

// ── Middleware ──
app.use(helmet());
app.use(
  cors({
    origin: [
      'app://.',                  // Electron custom protocol
      'http://localhost:5173',    // Vite dev server
      'http://localhost:3000',
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

// ── Routes ──
app.use('/api/profiles', profileRoutes);
app.use('/api/auth', authRoutes);

// ── Health check (Cloud Run uses this) ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'aerosphere-cloud-profiles' });
});

// ── Start ──
const PORT = parseInt(process.env.PORT ?? '8080', 10);
app.listen(PORT, () => {
  console.log(`AeroSphere Cloud Profiles API listening on :${PORT}`);
});
