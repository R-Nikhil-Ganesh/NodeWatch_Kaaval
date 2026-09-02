import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'kaaval-dev-secret-key-change-in-prod-2026',
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost:8081')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  database: {
    url: process.env.DATABASE_URL || '',
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },

  storage: {
    endpoint: process.env.MINIO_ENDPOINT || 'http://127.0.0.1:9000',
    region: process.env.MINIO_REGION || 'us-east-1',
    accessKeyId: process.env.MINIO_ROOT_USER || '',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD || '',
    bucket: process.env.MINIO_BUCKET || 'evidence-vault',
    presignedUrlExpiry: parseInt(process.env.PRESIGNED_URL_EXPIRY || '900', 10), // 15 minutes
  },

  fabric: {
    disabled: process.env.FABRIC_DISABLED === 'true',
    channelName: process.env.FABRIC_CHANNEL || 'mychannel',
    chaincodeName: process.env.FABRIC_CHAINCODE || 'evidence',
    discoveryEnabled: process.env.FABRIC_DISCOVERY !== 'false',
    asLocalhost: process.env.FABRIC_AS_LOCALHOST !== 'false',
    connectionProfilePath: path.resolve(
      __dirname,
      process.env.FABRIC_CCP_PATH || '../../../backend_mobile/connection-org1-with-org2.json'
    ),
    walletPath: path.resolve(
      __dirname,
      process.env.FABRIC_WALLET_PATH || '../../../backend_mobile/wallet'
    ),
    defaultIdentity: process.env.FABRIC_USER || 'appUser',
  },

  outbox: {
    pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL || '3000', 10),
    maxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES || '5', 10),
    batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '10', 10),
  }
};
