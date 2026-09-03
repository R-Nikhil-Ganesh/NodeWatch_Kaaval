# Kaaval — Integrated Digital Evidence & Chain-of-Custody Platform

[![Blockchain](https://img.shields.io/badge/Blockchain-Hyperledger%20Fabric%202.5-blue.svg)](https://www.hyperledger.org/projects/fabric)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016-336791.svg)](https://www.postgresql.org/)
[![Storage](https://img.shields.io/badge/Object%20Storage-MinIO%20S3-C72C48.svg)](https://min.io/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20Express-green.svg)](https://nodejs.org/)
[![Legal Compliance](https://img.shields.io/badge/Legal%20Compliance-BSA%20Section%2063-gold.svg)](https://indiacode.nic.in/)

Kaaval is an enterprise digital evidence management, forensic integrity validation, and legal chain-of-custody platform engineered for **Law Enforcement (Police)**, **Forensic Science Laboratories (FSL)**, and the **Judiciary (Courts)** in compliance with **Section 63 of the Bharatiya Sakshya Adhiniyam (BSA), 2023**.

---

## 🏛️ System Architecture

```mermaid
graph TB
    subgraph Clients["1. Application Clients"]
        Mobile["📱 Mobile Field App (Expo / SQLite)<br>• At-source SHA-256 Hashing<br>• Offline Sync Queue"]
        Web["💻 Web Management Portal (React 19)<br>• Case Management & Visibility<br>• Forensics Verification<br>• Section 63 BSA Certificates"]
    end

    subgraph BackendLayer["2. Unified Modular Backend (Port 4000)"]
        MobileRoutes["/api/mobile/*<br>• Streaming Evidence Ingestion<br>• Hash Verification<br>• Batch Sync Receiver"]
        WebRoutes["/api/web/*<br>• RBAC Case Queries<br>• Forensic Validation<br>• Certificate Issuance"]
        Services["Core Services Layer<br>• S3 Storage Adapter (MinIO)<br>• SHA-256 Hashing Engine<br>• Audit Logger (Deterministic Digest)"]
        OutboxWorker["Transactional Outbox Worker<br>• Background Polling<br>• Exponential Backoff & Retries<br>• Real-Time Terminal Diagnostics"]
    end

    subgraph Persistence["3. Storage & Database Layer"]
        PG["🗄️ PostgreSQL 16 (Port 5433)<br>• Relational Entities<br>• blockchain_outbox Table<br>• Audit Trail with Foreign Key Safety"]
        MinIO["📦 MinIO S3 Vault (Ports 9000 / 9001)<br>• Private evidence-vault Bucket<br>• Pre-signed Short-lived URLs"]
    end

    subgraph Blockchain["4. Hyperledger Fabric Ledger (3-Org Consortium)"]
        PoliceMSP["Org 1: PoliceMSP<br>• Evidence Seizure<br>• Transfer Initiation"]
        FSLMSP["Org 2: FSLMSP<br>• Custody Acceptance<br>• Forensic Verification<br>• Tamper Breach Flags"]
        CourtMSP["Org 3: CourtMSP<br>• Section 63 BSA Digital Anchoring<br>• Judicial Timeline Inspection"]
    end

    Mobile -->|HTTP Streaming /api/mobile| MobileRoutes
    Web -->|HTTP /api/web| WebRoutes
    MobileRoutes --> Services
    WebRoutes --> Services
    Services --> PG
    Services --> MinIO
    PG --> OutboxWorker
    OutboxWorker -->|Fabric Gateway gRPC| PoliceMSP
    OutboxWorker -->|Fabric Gateway gRPC| FSLMSP
    OutboxWorker -->|Fabric Gateway gRPC| CourtMSP
```

---

## 🚀 Quick Start

### 1. Start Docker Infrastructure (PostgreSQL & MinIO)
```powershell
docker compose up -d
```

### 2. Start Unified Backend Server (Port 4000)
```powershell
cd backend
npm install
npm start
```

### 3. Start Web Management Portal (Port 5173)
```powershell
cd frontend_web
npm install
npm run dev
```

### 4. Start Mobile Field Application (Expo)
```powershell
cd frontend_mobile
npm install
npm start
```

### 5. Run Automated End-to-End Verification Suite
```powershell
cd backend
node test_e2e.js
```

---

## 📚 Technical Documentation

Comprehensive architectural and operational guides are available in [`docs/`](./docs):

* 🔗 [**Blockchain Architecture (`docs/BLOCKCHAIN_ARCHITECTURE.md`)**](./docs/BLOCKCHAIN_ARCHITECTURE.md) — 3-Organization Hyperledger Fabric consortium (`PoliceMSP`, `FSLMSP`, `CourtMSP`), append-only event ledger smart contract (`evidence.go`), composite key scans, and Section 63 BSA legal anchoring.
* ⚙️ [**Backend Architecture (`docs/BACKEND_ARCHITECTURE.md`)**](./docs/BACKEND_ARCHITECTURE.md) — Unified Modular Backend design, `/api/mobile` vs `/api/web` segregation, Transactional Outbox worker engine, MinIO S3 storage adapter, and terminal diagnostics.
* 🗄️ [**Database Schema (`docs/DATABASE_SCHEMA.md`)**](./docs/DATABASE_SCHEMA.md) — PostgreSQL 16 schema, custom ENUM types, outbox table, indexes, and foreign key integrity.
* 📱 [**Mobile Field App Guide (`docs/MOBILE_APP_GUIDE.md`)**](./docs/MOBILE_APP_GUIDE.md) — Offline-first SQLite storage, native `expo-crypto` SHA-256 hashing at capture, and sync worker.
* 💻 [**Web Portal Guide (`docs/WEB_PORTAL_GUIDE.md`)**](./docs/WEB_PORTAL_GUIDE.md) — React 19 / Vite management portal, role-based dashboards (Admin, Police, Forensics, Legal), and 5-second live polling sync.
* 🛠️ [**Deployment & Operational Runbook (`docs/DEPLOYMENT_AND_RUNBOOK.md`)**](./docs/DEPLOYMENT_AND_RUNBOOK.md) — Docker Compose setup, environment variable configuration, Hyperledger Fabric test network integration, and test credentials.