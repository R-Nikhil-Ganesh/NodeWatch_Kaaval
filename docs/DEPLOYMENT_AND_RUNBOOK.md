# Deployment & Operational Runbook

> **Repository Root:** `d:\chain_of_custody`  
> **Host Requirements:** Docker Desktop (Windows / macOS / Linux), Node.js v18+, Go 1.20+ (for chaincode compilation)

---

## 1. Environment Configuration

Copy the template [`.env.example`](file:///d:/chain_of_custody/.env.example) to `.env` in the repository root:

```powershell
cp .env.example .env
```

### Key Configuration Variables:

```bash
# --- PostgreSQL Database ---
DB_NAME=kaaval_db
DB_USER=postgres
DB_PASSWORD=your_secure_postgres_password
DB_PORT=5433

# --- MinIO S3 Object Storage ---
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your_secure_minio_password
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_BUCKET=evidence-vault
MINIO_ENDPOINT=http://127.0.0.1:9000

# --- Backend Application ---
PORT=4000
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}
JWT_SECRET=kaaval-production-jwt-secret-key-2026
JWT_EXPIRY=7d

# --- Hyperledger Fabric Network ---
FABRIC_DISABLED=false
FABRIC_CHANNEL=mychannel
FABRIC_CHAINCODE=evidence
FABRIC_DISCOVERY=true
FABRIC_AS_LOCALHOST=true
FABRIC_USER=appUser
```

---

## 2. Infrastructure Setup (PostgreSQL & MinIO)

Launch PostgreSQL 16 and MinIO S3 Object Storage via Docker Compose:

```powershell
docker compose up -d
```

### Inspect Container Health:
```powershell
docker ps --filter "name=kaaval"
```
Expected output:
* `kaaval-postgres` — Status: `Up (healthy)`, Port: `5433->5432`
* `kaaval-minio` — Status: `Up (healthy)`, Ports: `9000->9000` (S3 API), `9001->9001` (Web Console)
* `kaaval-minio-init` — Status: `Exited (0)` (Bucket `evidence-vault` provisioned)

### Apply Schema & Seed Initial Users:
```powershell
# Apply PostgreSQL schema
Get-Content backend/src/db/schema.sql | docker exec -i kaaval-postgres psql -U postgres -d kaaval_db

# Seed system authentication accounts
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/kaaval_db"; node backend/src/db/seed.cjs
```

---

## 3. Starting the Platform

### Terminal 1: Unified Modular Backend (Port 4000)
```powershell
cd backend
npm install
npm start
```

### Terminal 2: Web Management Portal (Port 5173 / 3000)
```powershell
cd frontend_web
npm install
npm run dev
```

### Terminal 3: Mobile Field Application (Expo)
```powershell
cd frontend_mobile
npm install
npm start
```

---

## 4. Hyperledger Fabric Test Network Integration

To bring up the Hyperledger Fabric blockchain consortium:

```bash
# Inside WSL / Linux terminal:
cd fabric-samples/test-network

# 1. Bring up network with Org1 (Police) and Org2 (FSL) with Raft ordering
./network.sh up createChannel -c mychannel -ca

# 2. Deploy the Kaaval smart contract
./network.sh deployCC -ccn evidence -ccp ../../chaincode/evidence/go -ccl go
```

*When the Fabric network is not running, the backend runs in Standalone Database Mode with pending outbox records safely queued in PostgreSQL.*

---

## 5. Automated End-to-End Verification Suite

Run the automated test runner in [`backend/test_e2e.js`](file:///d:/chain_of_custody/backend/test_e2e.js):

```powershell
cd backend
node test_e2e.js
```

### Expected Output:
```text
====================================================
🧪 RUNNING KAAVAL END-TO-END INTEGRATION TEST SUITE
====================================================

⏳ Testing: 1. Health & Infrastructure Check... ✅ PASSED
⏳ Testing: 2. Mobile Field Officer Authentication... ✅ PASSED
⏳ Testing: 3. Web Admin / Forensic Authentication... ✅ PASSED
⏳ Testing: 4. Field Case Creation (/api/mobile/cases)... ✅ PASSED
⏳ Testing: 5. Streaming Evidence Ingestion & SHA-256 Validation (/api/mobile/cases/:id/evidence)... ✅ PASSED
⏳ Testing: 6. Forensic Laboratory Hash Verification (/api/web/forensics/verify)... ✅ PASSED
⏳ Testing: 7. BSA Section 63 Digital Certificate Issuance (/api/web/evidence/:id/section63)... ✅ PASSED
⏳ Testing: 8. Offline Batch Queue Sync (/api/mobile/sync/push)... ✅ PASSED

====================================================
🎉 TEST SUMMARY: 8 PASSED | 0 FAILED
====================================================
```

---

## 6. Seed Credentials for Testing

| Username | Password | Role | Organization | Designation |
|---|---|---|---|---|
| `admin1` | `password123` | `ADMIN` | `Org1MSP` | IT Director |
| `police1` | `password123` | `POLICE` | `Org1MSP` | Inspector of Police (`TN-PD-402`) |
| `police2` | `password123` | `POLICE` | `Org1MSP` | Superintendent of Police (`TN-PD-551`) |
| `forensic1` | `password123` | `FORENSICS` | `Org2MSP` | Senior Scientific Officer |
| `forensic2` | `password123` | `FORENSICS` | `Org2MSP` | Scientific Assistant |
| `legal1` | `password123` | `LEGAL` | `CourtMSP` | Public Prosecutor |
