# Dual Organization Endorsement Implementation Summary

## Problem Statement
The Kaaval blockchain application needed to enforce approval from **both Org1MSP and Org2MSP** before any transaction is written to the blockchain. Currently, the chaincode may be deployed without a specific endorsement policy, allowing transactions with only single-organization approval.

## Solution Overview
Implemented a **chaincode-level endorsement policy** using Hyperledger Fabric's signature policy feature. This requires multi-party consensus before any state changes are committed to the ledger.

## What Was Changed

### 1. Documentation Created
Created comprehensive guides for implementing and verifying dual-org endorsement:

- **`ENDORSEMENT_QUICK_START.md`** - Step-by-step guide to enable dual-org approval
- **`ENDORSEMENT_POLICY.md`** - Detailed technical documentation
- **`README.md`** - Updated with security notes and documentation links

### 2. Deployment Scripts Created
- **`deploy-chaincode-with-policy.sh`** - Linux/WSL script for automated deployment
- **`deploy-chaincode-with-policy.bat`** - Windows batch wrapper

### 3. Enhanced Connection Profile (Optional)
- **`connection-org1-with-org2.json`** - Connection profile including both organizations for better peer discovery

### 4. Backend Configuration (No Code Changes Required)
The existing `Kaaval_Backend/app.js` already uses the Fabric Gateway SDK with discovery enabled, which means:
- ✅ No backend code modifications needed
- ✅ SDK automatically discovers the endorsement policy
- ✅ SDK automatically sends proposals to all required peers
- ✅ SDK collects endorsements from both organizations
- ✅ Transaction only commits if both orgs approve

## How It Works

### Before (Single Org Approval)
```
User Request → Backend → Fabric Gateway → Org1 Peer → Orderer → Commit
```

### After (Dual Org Approval)
```
User Request → Backend → Fabric Gateway SDK
                              ↓
                         Discovers Policy
                              ↓
              ┌───────────────┴────────────────┐
              ↓                                ↓
          Org1 Peer                       Org2 Peer
          (Endorses)                      (Endorses)
              ↓                                ↓
              └───────────────┬────────────────┘
                              ↓
                    Collect Endorsements
                              ↓
                          Orderer
                              ↓
                      Commit to Ledger
```

## Key Features

### 1. Endorsement Policy Enforcement
```bash
--signature-policy "AND('Org1MSP.peer','Org2MSP.peer')"
```
- **AND**: Both organizations must approve
- Enforced at the chaincode level
- Cannot be bypassed by clients

### 2. Automatic Discovery
The Fabric Gateway SDK with discovery enabled:
- Reads the policy from chaincode definition
- Finds all required endorsing peers
- Automatically sends to correct peers
- Collects all necessary signatures

### 3. No Backend Changes
Because `FABRIC_DISCOVERY_ENABLED=true` (default), the backend automatically:
- Discovers both Org1 and Org2 peers
- Sends transaction proposals to both
- Waits for dual endorsements
- Only proceeds when both approve

## Implementation Steps

### For Users to Deploy:

1. **Update chaincode deployment** with endorsement policy:
   ```bash
   cd /mnt/d/chain_of_custody/fabric-samples/test-network
   ./network.sh deployCC \
     -c mychannel \
     -ccn evidence \
     -ccp /mnt/d/chain_of_custody/chaincode/evidence/go \
     -ccl go \
     --signature-policy "AND('Org1MSP.peer','Org2MSP.peer')"
   ```

2. **Verify policy is active:**
   ```bash
   peer lifecycle chaincode querycommitted -C mychannel -n evidence
   # Should show: Endorsement: AND('Org1MSP.peer','Org2MSP.peer')
   ```

3. **Test single peer (should fail):**
   ```bash
   peer chaincode invoke ... --peerAddresses localhost:7051 ...
   # Expected: Endorsement policy failure
   ```

4. **Test dual peer (should succeed):**
   ```bash
   peer chaincode invoke \
     --peerAddresses localhost:7051 ... \
     --peerAddresses localhost:9051 ...
   # Expected: Success
   ```

5. **Run backend normally:**
   ```bash
   cd /mnt/d/chain_of_custody/Kaaval_Backend
   node app.js
   # SDK automatically handles dual endorsement
   ```

## Verification

### Command Line Test
```bash
# This command from your terminal should succeed
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile .../tlsca.example.com-cert.pem \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles .../org1/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles .../org2/ca.crt \
  --waitForEvent --waitForEventTimeout 30s \
  -C mychannel -n evidence \
  -c '{"Args":["CreateEvidence","TEST","CASE-001","h1","h2","h3","LOW"]}'
```

### Backend API Test
```bash
curl -X POST http://localhost:3000/evidence \
  -H "Content-Type: application/json" \
  -d '{"evidenceID":"API-001","caseID":"CASE-001","fileHash":"abc","metaHash":"def","riskLevel":"LOW"}'
```

**Expected in backend logs:**
```
Submitting CreateEvidence: API-001
[Gateway discovery found peers: Org1, Org2]
[Transaction endorsed by: Org1MSP, Org2MSP]
Evidence created successfully
```

## Security Benefits

### 1. Multi-Party Consensus
- No single organization can unilaterally modify records
- Requires agreement from both police department and forensics lab
- Prevents unauthorized evidence tampering

### 2. Enhanced Accountability
- Both organizations' signatures on every transaction
- Audit trail shows dual approval
- Cannot be bypassed by compromised peer

### 3. Chain of Custody Integrity
- Evidence transfers require both parties
- Custody changes are cryptographically verified
- Immutable record of dual authorization

## Testing Checklist

- [ ] Chaincode deployed with `AND('Org1MSP.peer','Org2MSP.peer')` policy
- [ ] `peer lifecycle chaincode querycommitted` shows correct policy
- [ ] Single-peer invoke fails with "endorsement policy not satisfied"
- [ ] Dual-peer invoke succeeds
- [ ] Backend API creates evidence without errors
- [ ] Backend logs show discovery of both peers
- [ ] Query shows evidence committed to blockchain
- [ ] Both organizations can see the same data

## Troubleshooting

### Issue: Single peer still works
**Cause:** Chaincode deployed without endorsement policy  
**Solution:** Redeploy with `--signature-policy` flag

### Issue: Backend fails with "endorsement policy failure"
**Cause:** Discovery disabled or connection profile incomplete  
**Solution:** Ensure `FABRIC_DISCOVERY_ENABLED=true` in .env

### Issue: Cannot find Org2 peers
**Cause:** Connection profile only has Org1  
**Solution:** Use `connection-org1-with-org2.json` or rely on discovery

## Files Created

```
chain_of_custody/
├── ENDORSEMENT_QUICK_START.md          # Step-by-step guide
├── ENDORSEMENT_POLICY.md               # Detailed documentation
├── deploy-chaincode-with-policy.sh     # Linux deployment script
├── deploy-chaincode-with-policy.bat    # Windows wrapper script
└── Kaaval_Backend/
    └── connection-org1-with-org2.json  # Enhanced connection profile
```

## What Changed in Existing Files

### README.md
- Added endorsement policy documentation links
- Enhanced security notes with dual-org recommendation
- Added to "Before Production" checklist

### No Changes to Application Code
- ✅ `chaincode/evidence/go/evidence.go` - No changes needed
- ✅ `Kaaval_Backend/app.js` - No changes needed
- ✅ Fabric Gateway SDK handles everything automatically

## Next Steps for Users

1. **Read:** Start with `ENDORSEMENT_QUICK_START.md`
2. **Deploy:** Run the deployment script or manual commands
3. **Verify:** Follow the verification steps
4. **Test:** Use both CLI and backend API
5. **Monitor:** Check logs to see dual endorsement in action

## References

- Hyperledger Fabric: [Endorsement Policies](https://hyperledger-fabric.readthedocs.io/en/latest/endorsement-policies.html)
- Fabric SDK Node: [Gateway API](https://hyperledger.github.io/fabric-sdk-node/)
- Test Network: [Deploying Chaincode](https://hyperledger-fabric.readthedocs.io/en/latest/deploy_chaincode.html)

---

**Status:** ✅ Complete  
**Date:** February 2026  
**Impact:** Security enhancement - requires dual organizational approval  
**Breaking Change:** No - existing deployments continue to work  
**Recommended Action:** Deploy with endorsement policy for production use
