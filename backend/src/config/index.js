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
      process.env.FABRIC_CCP_PATH || './connection-3org.json'
    ),
    walletPath: path.resolve(
      __dirname,
      process.env.FABRIC_WALLET_PATH || '../../wallet'
    ),
    defaultIdentity: process.env.FABRIC_USER || 'appUser',
    orgs: {
      police: {
        mspId: process.env.FABRIC_POLICE_MSPID || 'Org1MSP',
        peer: process.env.FABRIC_POLICE_PEER || 'peer0.org1.example.com:7051',
        ca: process.env.FABRIC_POLICE_CA || 'https://localhost:7054',
        role: 'POLICE',
      },
      forensics: {
        mspId: process.env.FABRIC_FORENSICS_MSPID || 'Org2MSP',
        peer: process.env.FABRIC_FORENSICS_PEER || 'peer0.org2.example.com:9051',
        ca: process.env.FABRIC_FORENSICS_CA || 'https://localhost:8054',
        role: 'FORENSICS',
      },
      court: {
        mspId: process.env.FABRIC_COURT_MSPID || 'Org3MSP',
        peer: process.env.FABRIC_COURT_PEER || 'peer0.org3.example.com:11051',
        ca: process.env.FABRIC_COURT_CA || 'https://localhost:11054',
        role: 'LEGAL',
      },
    },
    endorsementPolicy: process.env.FABRIC_ENDORSEMENT_POLICY || "OutOf(2, 'Org1MSP.peer', 'Org2MSP.peer', 'Org3MSP.peer')",
  },

  outbox: {
    pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL || '3000', 10),
    maxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES || '5', 10),
    batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '10', 10),
  }
};
