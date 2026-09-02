# Dual-Organization Endorsement Policy

## Overview

Kaaval_Backend now enforces **dual-organization endorsement** for all blockchain write operations. This means that both **Org1MSP** and **Org2MSP** must approve and sign any transaction before it is written to the blockchain.

## What Changed

### 1. Connection Profile Update
- **Old**: Connected via `connection-org1.json` (single organization)
- **New**: Connects via `connection-org1-with-org2.json` (dual organizations)

### 2. Network Configuration
The new connection profile includes both organizations:
```json
{
    "organizations": {
        "Org1": { "mspid": "Org1MSP", "peers": ["peer0.org1.example.com"] },
        "Org2": { "mspid": "Org2MSP", "peers": ["peer0.org2.example.com"] }
    },
    "peers": {
        "peer0.org1.example.com": { "url": "grpcs://localhost:7051" },
        "peer0.org2.example.com": { "url": "grpcs://localhost:9051" }
    }
}
```

### 3. Affected Operations
The following transactions now require dual-org endorsement:
- **CreateEvidence** - Creating new evidence records
- **RequestTransfer** - Initiating custody transfers
- **AcceptTransfer** - Finalizing custody transfers  
- **ReadEvidence** - Reading evidence with audit logging

## How It Works

1. **Transaction Submission**: When you call an API endpoint like `/evidence`, the backend submits the transaction to the Hyperledger Fabric network.

2. **Endorsement Phase**: The Fabric SDK automatically routes the transaction to:
   - `peer0.org1.example.com:7051` (Org1MSP)
   - `peer0.org2.example.com:9051` (Org2MSP)

3. **Validation**: Both peers validate the transaction independently.

4. **Approval**: Both peers must sign off (endorse) the transaction.

5. **Commit**: Only after receiving endorsements from BOTH organizations does the orderer commit the transaction to the blockchain.

## Verification

### Check Endorsement Status
GET `/network/endorsement-policy`

Response:
```json
{
    "message": "Dual-org endorsement enabled",
    "endorsementMode": "BOTH_ORG1_AND_ORG2_REQUIRED",
    "organizations": ["Org1", "Org2"],
    "configuredPeers": ["peer0.org1.example.com", "peer0.org2.example.com"],
    "peerDetails": {
        "org1": "peer0.org1.example.com configured at grpcs://localhost:7051",
        "org2": "peer0.org2.example.com configured at grpcs://localhost:9051"
    }
}
```

### Manual Verification via CLI
You can also verify with peer CLI commands:
```bash
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile <path-to-orderer-ca> \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles <path-to-org1-ca> \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles <path-to-org2-ca> \
  -C mychannel -n evidence \
  -c '{"Args":["CreateEvidence","EVID-001","CASE-001","hash1","hash2","hash3","LOW"]}'
```

## Security Benefits

1. **Dual Approval**: No single organization can unilaterally approve evidence records
2. **Consensus**: Requires agreement between two independent authorities
3. **Auditability**: Both organizations' signatures are recorded on the blockchain
4. **Integrity**: Changes to evidence records require cooperation of both parties

## Environment Variables

Ensure your `.env` file has:
```
FABRIC_DISABLED=false
FABRIC_DISCOVERY_ENABLED=true
FABRIC_AS_LOCALHOST=true
```

## Troubleshooting

### Transaction Rejection
If transactions fail with "endorsement mismatch" or similar errors:
1. Verify both peers are running:
   - `peer0.org1.example.com:7051`
   - `peer0.org2.example.com:9051`
2. Check network connectivity between backend and both peers
3. Verify certificates in connection profile are valid

### Timeout Issues
If transactions timeout:
- Increase the `endorser` timeout in `connection-org1-with-org2.json`
- Default is set to 300 seconds, which should be sufficient
- Check backend logs for peer communication errors

### Wallet/Identity Issues
- Ensure `appUser` identity exists in the wallet directory
- Identity should be registered with CA and have valid credentials
- Verify cryptographic materials are not corrupted

## File Locations

- **Connection Profile**: `Kaaval_Backend/connection-org1-with-org2.json`
- **Backend App**: `Kaaval_Backend/app.js`
- **Wallet**: `Kaaval_Backend/wallet/`
