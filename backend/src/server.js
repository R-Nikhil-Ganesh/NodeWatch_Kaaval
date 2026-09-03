import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { query } from './db/index.js';
import { storageService } from './services/storageService.js';
import { fabricGatewayService } from './services/fabricGatewayService.js';
import { outboxWorker } from './services/outboxWorker.js';

// Mobile Route Imports
import mobileAuthRoutes from './routes/mobile/authRoutes.js';
import mobileCaseRoutes from './routes/mobile/caseRoutes.js';
import mobileEvidenceRoutes from './routes/mobile/evidenceRoutes.js';
import mobileSyncRoutes from './routes/mobile/syncRoutes.js';

// Web Route Imports
import webAuthRoutes from './routes/web/authRoutes.js';
import webUserRoutes from './routes/web/userRoutes.js';
import webCaseRoutes from './routes/web/caseRoutes.js';
import webEvidenceRoutes from './routes/web/evidenceRoutes.js';
import webSection63Routes from './routes/web/section63Routes.js';
import webForensicsRoutes from './routes/web/forensicsRoutes.js';
import webDocumentRoutes from './routes/web/documentRoutes.js';
import webAuditRoutes from './routes/web/auditRoutes.js';

// Legal Route Imports
import legalCaseRoutes from './routes/legal/caseRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow any origin during local development or matched in config
    if (!origin || config.corsOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for local testing
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ---------------------------------------------------------------------------
// 1. MOBILE DOMAIN: /api/mobile/*
// ---------------------------------------------------------------------------
app.use('/api/mobile/auth', mobileAuthRoutes);
app.use('/api/mobile/cases', mobileCaseRoutes);
app.use('/api/mobile', mobileEvidenceRoutes);
app.use('/api/mobile/sync', mobileSyncRoutes);

// ---------------------------------------------------------------------------
// 2. WEB DOMAIN: /api/web/*
// ---------------------------------------------------------------------------
app.use('/api/web/auth', webAuthRoutes);
app.use('/api/web/users', webUserRoutes);
app.use('/api/web/cases', webCaseRoutes);
app.use('/api/web/evidence', webEvidenceRoutes);
app.use('/api/web/evidence', webSection63Routes);
app.use('/api/web/forensics', webForensicsRoutes);
app.use('/api/web/documents', webDocumentRoutes);
app.use('/api/web/audit/logs', webAuditRoutes);

// ---------------------------------------------------------------------------
// 3. LEGAL DOMAIN: /api/legal/* (Court Management System frontend)
// Auth/users/evidence/documents/audit reuse the web domain's routers as-is —
// same users table (LEGAL role), same evidence/document/audit_logs tables.
// Only cases/hearings get a legal-specific router for the richer court schema.
// ---------------------------------------------------------------------------
app.use('/api/legal/auth', webAuthRoutes);
app.use('/api/legal/users', webUserRoutes);
app.use('/api/legal/cases', legalCaseRoutes);
app.use('/api/legal/evidence', webEvidenceRoutes);
app.use('/api/legal/evidence', webSection63Routes);
app.use('/api/legal/documents', webDocumentRoutes);
app.use('/api/legal/audit/logs', webAuditRoutes);

// ---------------------------------------------------------------------------
// 4. COMPATIBILITY ALIASES (Direct /api/* fallback for existing frontend)
// ---------------------------------------------------------------------------
app.use('/api/auth', webAuthRoutes);
app.use('/api/users', webUserRoutes);
app.use('/api/cases', webCaseRoutes);
app.use('/api/evidence', webEvidenceRoutes);
app.use('/api/evidence', webSection63Routes);
app.use('/api/documents', webDocumentRoutes);
app.use('/api/logs', webAuditRoutes);
app.use('/cases', mobileCaseRoutes);
app.use('/', mobileEvidenceRoutes);
app.use('/api/sync', mobileSyncRoutes);

// ---------------------------------------------------------------------------
// 5. HEALTH & DIAGNOSTIC ENDPOINTS
// ---------------------------------------------------------------------------
app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    const minioAlive = await storageService.fileExists('health_check_dummy').catch(() => false);
    res.json({
      status: 'ok',
      service: 'Kaaval Unified Modular Backend',
      database: 'connected',
      minio: minioAlive ? 'connected' : 'reachable',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

app.get('/health/fabric', async (req, res) => {
  const fabricHealth = await fabricGatewayService.checkHealth();
  res.json({
    status: fabricHealth.connected ? 'ok' : 'degraded',
    fabric: fabricHealth,
    timestamp: new Date().toISOString(),
  });
});

// Start Background Workers & Server
app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🛡️  KAAVAL UNIFIED BACKEND RUNNING ON PORT ${config.port}`);
  console.log(`📱 Mobile Routes:   http://localhost:${config.port}/api/mobile/*`);
  console.log(`💻 Web Routes:      http://localhost:${config.port}/api/web/*`);
  console.log(`⚖️  Legal Routes:    http://localhost:${config.port}/api/legal/*`);
  console.log(`🗄️  PostgreSQL:      ${config.database.url}`);
  console.log(`📦 MinIO S3 Vault:  ${config.storage.endpoint} [${config.storage.bucket}]`);
  console.log(`🔗 Fabric Outbox:   Polling every ${config.outbox.pollIntervalMs}ms`);
  console.log(`=======================================================`);

  // Start the background Transactional Outbox Worker
  outboxWorker.start();
});
