# NodeWatch System Architecture

## 🏗️ Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NODEWATCH APPLICATION                         │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                  FRONTEND (React Native - Expo)                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    UI SCREENS                               │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │  • AuthScreen (Login, BiometricAuth)                        │    │
│  │  • DashboardScreen (Cases List, Stats)                     │    │
│  │  • CreateCaseScreen (New Case Genesis Block)                │    │
│  │  • EvidenceScreen (Upload Evidence, View Chain of Custody) │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                             ↓                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 CONTEXT + HOOKS (State)                      │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │  • AppContext (user, cases, loading, error)                │    │
│  │  • useApp() Hook                                            │    │
│  │  • AsyncStorage (Local Persistence)                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                             ↓                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              API SERVICE LAYER (axios)                      │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │  • createEvidence(id, caseId, hash...)                     │    │
│  │  • readEvidence(id)                                         │    │
│  │  • getEvidenceHistory(id)                                   │    │
│  │  • queryCaseEvidence(caseId)                               │    │
│  │  • requestTransfer(id, targetMSP)                          │    │
│  │  • acceptTransfer(id)                                       │    │
│  │  • Error Handling & Retry Logic                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                             ↓                                        │
└────────────────────────────────────────────────────────────────────── HTTP
                              ↓
┌────────────────────────────────────────────────────────────────────── PORT 3000
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │          BACKEND (Node.js + Express)                          │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │          EXPRESS ROUTES                            │    │   │
│  │  ├────────────────────────────────────────────────────┤    │   │
│  │  │  POST /evidence → CreateEvidence chaincode call   │    │   │
│  │  │  GET /evidence/:id → ReadEvidence chaincode call  │    │   │
│  │  │  GET /evidence/history/:id → GetEvidenceHistory   │    │   │
│  │  │  GET /case/:id → QueryByCaseID chaincode call     │    │   │
│  │  │  POST /transfer/request → RequestTransfer         │    │   │
│  │  │  POST /transfer/accept → AcceptTransfer           │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │                       ↓                                      │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │      FABRIC NETWORK CONNECTION (Gateway API)       │    │   │
│  │  ├────────────────────────────────────────────────────┤    │   │
│  │  │  • Connection: connection-org1.json               │    │   │
│  │  │  • Wallet: wallet/                                │    │   │
│  │  │  • Identity: appUser                              │    │   │
│  │  │  • Channel: mychannel                             │    │   │
│  │  │  • Chaincode: evidence                            │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │                       ↓                                      │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │    HYPERLEDGER FABRIC NETWORK                      │    │   │
│  │  ├────────────────────────────────────────────────────┤    │   │
│  │  │  • Peers (Endorsers)                              │    │   │
│  │  │  • Orderers                                       │    │   │
│  │  │  • Smart Contracts (Chaincode)                    │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │                       ↓                                      │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │        DISTRIBUTED BLOCKCHAIN LEDGER              │    │   │
│  │  ├────────────────────────────────────────────────────┤    │   │
│  │  │  Genesis Block → Case 1                            │    │   │
│  │  │  Block 2 → Evidence 1 with Hash                    │    │   │
│  │  │  Block 3 → Evidence 2 with Hash                    │    │   │
│  │  │  Block 4 → Transfer Request 1                      │    │   │
│  │  │  Block 5 → Transfer Accept 1                       │    │   │
│  │  │  ...                                               │    │   │
│  │  │  Immutable, Cryptographically Secured              │    │   │
│  │  └────────────────────────────────────────────────────┘    │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Component Interaction Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  AuthScreen              DashboardScreen            CreateCaseScreen      │
│       ↓                        ↓                             ↓             │
│    [Login]              [Display Cases]           [New Case Form]         │
│       ↓                        ↓                             ↓             │
│  useApp()  ←──────────────────┴──────────────────────────→  useApp()      │
│       ↓                                                       ↓             │
│       └─────────────────→ AppContext ←───────────────────────┘             │
│                              ↓                                            │
│                    [user, cases, loading,                                │
│                      error states]                                        │
│                              ↓                                            │
│                    ┌─────────┴──────────┐                                │
│                    ↓                    ↓                                │
│            addCase()        updateCaseEvidence()                         │
│                    ↓                    ↓                                │
│                    └─────────┬──────────┘                                │
│                              ↓                                            │
│                         apiService                                       │
│          (src/services/api.ts - Axios HTTP Client)                      │
│                              ↓                                            │
└──────────────────────────────┼────────────────────────────────────────────┘
                               │ HTTP POST/GET
                               ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Express Router                                                           │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │ POST /evidence                                            │            │
│  │ GET /evidence/:id                                         │            │
│  │ GET /evidence/history/:id                                │            │
│  │ GET /case/:id                                            │            │
│  │ POST /transfer/request                                    │            │
│  │ POST /transfer/accept                                     │            │
│  └──────────────────────────────────────────────────────────┘            │
│                         ↓                                                 │
│  connectToNetwork()                                                      │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │ 1. Load connection-org1.json                              │            │
│  │ 2. Create wallet                                          │            │
│  │ 3. Connect Gateway                                        │            │
│  │ 4. Get network (mychannel)                                │            │
│  │ 5. Get contract (evidence)                                │            │
│  └──────────────────────────────────────────────────────────┘            │
│                         ↓                                                 │
│  Fabric Gateway API                                                      │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │ submitTransaction() / evaluateTransaction()               │            │
│  │ Calls Smart Contract Methods                             │            │
│  └──────────────────────────────────────────────────────────┘            │
│                         ↓                                                 │
└──────────────────────────────┼────────────────────────────────────────────┘
                               │ gRPC Protocol
                               ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                     HYPERLEDGER FABRIC NETWORK                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Peers (org1)              Orderers              Peers (org2)           │
│  ┌──────────────┐       ┌──────────┐       ┌──────────────┐             │
│  │ Endorser     │◄──────┤ Orderer  ├─────►│ Endorser     │             │
│  │ Committer    │       │          │       │ Committer    │             │
│  │ Ledger       │       └──────────┘       │ Ledger       │             │
│  └──────────────┘                          └──────────────┘             │
│         ↓                                          ↓                     │
│    Smart Contract                            Smart Contract             │
│    (evidence Chaincode)                      (evidence Chaincode)       │
│         ↓                                          ↓                     │
│  ┌────────────────────────────────────────────────────────┐             │
│  │   Functions:                                           │             │
│  │   • CreateEvidence(id, caseID, hash)                  │             │
│  │   • ReadEvidence(id)                                  │             │
│  │   • GetEvidenceHistory(id)                            │             │
│  │   • QueryByCaseID(caseID)                             │             │
│  │   • RequestTransfer(id, targetMSP)                    │             │
│  │   • AcceptTransfer(id)                                │             │
│  └────────────────────────────────────────────────────────┘             │
│                         ↓                                                 │
└──────────────────────────────────────────────────────────────────────────┘
                           ↓
              ┌─────────────────────────────┐
              │                             │
              ↓                             ↓
         ┌─────────┐                  ┌─────────┐
         │ Block 1 │                  │ Block 2 │
         │ Genesis │ ◄────────────────│Evidence │
         └─────────┘                  └─────────┘
              ▲                             │
              └─────────────────────────────┘
                  BLOCKCHAIN LEDGER
              (Immutable & Cryptographically
               Secured by All Network Nodes)
```

---

## 🔄 Data Flow Examples

### 1. Create New Case Flow

```
User Action: Tap "New Case" Button
    ↓
CreateCaseScreen Component
    ├─ Input: Title, Location
    ├─ State: [loading, setLoading]
    ↓
handleCreate() Function
    ├─ Validate inputs
    ├─ Create Case object
    ├─ Call addCase(newCase)
    ↓
AppContext.addCase()
    ├─ Generate timestamp
    ├─ Generate blockchain hash
    ├─ Update local state (setCases)
    ├─ Persist to AsyncStorage
    ├─ Call API (optional blockchain sync)
    ├─ [SET LOADING FALSE]
    ↓
apiService.queryCaseEvidence()
    ├─ HTTP GET /case/:id
    ├─ Backend receives request
    ├─ Calls Fabric network
    ├─ Smart contract queries ledger
    ↓
Hyperledger Fabric
    ├─ Peer nodes validate
    ├─ Orderer sequences
    ├─ All peers commit
    ├─ Ledger updated
    ↓
Response back to Frontend
    ├─ Success: Alert shown
    ├─ Error: Alert shown
    ├─ Navigation: Go back to Dashboard
    ↓
User sees new case in Active Cases list
```

### 2. Upload Evidence Flow

```
User Action: Tap "Camera" / "Upload" Button
    ↓
ImagePicker (Expo)
    ├─ Open camera or file picker
    ├─ User selects/takes photo
    ├─ Returns ImagePickerAsset
    ↓
analyzeDocument(asset)
    ├─ Create Evidence object
    ├─ Generate file hash
    ├─ Call updateCaseEvidence()
    ├─ [SET LOADING TRUE]
    ↓
AppContext.updateCaseEvidence()
    ├─ Generate evidenceID
    ├─ Generate fileHash, metaHash
    ├─ Call apiService.createEvidence()
    ↓
apiService.createEvidence()
    ├─ HTTP POST /evidence
    ├─ Payload: {evidenceID, caseID, fileHash, metaHash, riskLevel}
    ├─ Timeout: 10 seconds
    ↓
Express Backend
    ├─ Receive POST request
    ├─ Validate parameters
    ├─ Call connectToNetwork()
    ├─ Call contract.submitTransaction('CreateEvidence', ...)
    ↓
Hyperledger Fabric
    ├─ Endorser peers execute
    ├─ Orderer orders transaction
    ├─ Committer peers validate
    ├─ New block created
    ├─ Block added to ledger
    ↓
Smart Contract Updates State:
    ├─ Store evidence record
    ├─ Update case evidence list
    ├─ Set timestamp & hash
    ├─ Emit event
    ↓
Backend Response
    ├─ Return: {message, evidenceID}
    ├─ Status: 200 OK
    ↓
Frontend Updates State
    ├─ updateCaseEvidence() completes
    ├─ Local cases updated
    ├─ AsyncStorage persisted
    ├─ [SET LOADING FALSE]
    ↓
UI Updates
    ├─ Evidence appears in list
    ├─ Hash displayed
    ├─ Timestamp shown
    ├─ Success alert displayed
    ↓
User sees new evidence in case
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────┐
│                  FRONTEND                            │
│  ├─ HTTPS only (production)                          │
│  ├─ JWT tokens for auth                              │
│  ├─ Local storage encrypted                          │
│  ├─ Biometric authentication                         │
│  └─ No sensitive data in logs                        │
└─────────────────────────────────────────────────────┘
              ↓ TLS/HTTPS Encrypted ↓
┌─────────────────────────────────────────────────────┐
│                  BACKEND (Express)                   │
│  ├─ CORS enabled (configured domain only)            │
│  ├─ JWT middleware validation                        │
│  ├─ Input validation & sanitization                  │
│  ├─ Rate limiting                                    │
│  ├─ Helmet.js security headers                       │
│  └─ Secure wallet access                             │
└─────────────────────────────────────────────────────┘
              ↓ Fabric PKI/TLS ↓
┌─────────────────────────────────────────────────────┐
│          HYPERLEDGER FABRIC NETWORK                  │
│  ├─ mTLS between peers/orderers                      │
│  ├─ MSP (Membership Service Provider)                │
│  ├─ Certificate-based authentication                 │
│  ├─ Cryptographic validation of blocks              │
│  ├─ Immutable ledger (Byzantine Fault Tolerant)     │
│  └─ Endorsement policy enforcement                   │
└─────────────────────────────────────────────────────┘
```

---

## 📈 Scalability Considerations

```
Current Architecture:
┌──────────────────┐
│ Single Backend   │  ← All requests routed here
│ (Node.js)        │
└──────────────────┘

Future Scalability Options:

┌─────────────────────────────────────────┐
│          Load Balancer (NGINX)          │
└──────────────┬──────────────┬───────────┘
              ↓              ↓
       ┌──────────────┐  ┌──────────────┐
       │ Backend #1   │  │ Backend #2   │
       │ (Node.js)    │  │ (Node.js)    │
       └──────┬───────┘  └──────┬───────┘
              │                 │
              └────────┬────────┘
                       ↓
           ┌──────────────────────┐
           │ Shared Cache (Redis) │
           └──────────────────────┘
                       ↓
        ┌──────────────────────────────┐
        │ Message Queue (RabbitMQ)     │
        └──────────────────────────────┘
                       ↓
      ┌────────────────────────────────────┐
      │ Hyperledger Fabric Network         │
      │ (Multiple Organizations/Peers)     │
      └────────────────────────────────────┘
```

---

## 🔄 Technology Stack

```
FRONTEND LAYER:
├─ React Native 0.81.5
├─ Expo 54.0.31
├─ TypeScript
├─ React Navigation (Stack + Tabs)
├─ AsyncStorage (Persistence)
├─ Axios (HTTP Client) ← NEW
├─ Expo Image Picker
├─ Expo File System
├─ Expo Print (PDF Generation)
└─ React Native Vector Icons

BACKEND LAYER:
├─ Node.js
├─ Express 4.x
├─ Body Parser
├─ CORS
├─ Fabric Network SDK
│  ├─ @hyperledger/fabric-network
│  ├─ @hyperledger/fabric-ca-client
│  └─ grpc
└─ dotenv

BLOCKCHAIN LAYER:
├─ Hyperledger Fabric
├─ Chaincode (Go/JavaScript)
├─ Endorsing Peers
├─ Ordering Service
├─ Channel (mychannel)
└─ World State Database

DATA PERSISTENCE:
├─ AsyncStorage (Frontend)
├─ Hyperledger Fabric Ledger (Blockchain)
└─ Connection Profiles (connection-org1.json)
```

---

This architecture ensures:
- ✅ **Decoupling**: Frontend independent from backend implementation
- ✅ **Scalability**: Can add load balancer and multiple backends
- ✅ **Security**: Multi-layer encryption and authentication
- ✅ **Reliability**: Blockchain provides immutable record
- ✅ **Maintainability**: Clear separation of concerns
