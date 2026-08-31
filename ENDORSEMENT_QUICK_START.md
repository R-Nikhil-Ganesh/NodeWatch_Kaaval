# QUICK START: Enabling Dual Organization Endorsement

## What This Does
Configures your blockchain to require approval from **BOTH Org1 and Org2** before any transaction is written to the ledger. This ensures no single organization can unilaterally modify the chain of custody records.

---

## Prerequisites
- Hyperledger Fabric test-network is set up
- Evidence chaincode exists at `/mnt/d/chain_of_custody/chaincode/evidence/go`
- Backend is at `/mnt/d/chain_of_custody/Kaaval_Backend`

---

## Step 1: Update Backend Connection Profile (Optional but Recommended)

**Option A: Use enhanced connection profile with both orgs**

```bash
cd /mnt/d/chain_of_custody/Kaaval_Backend
cp connection-org1.json connection-org1.backup.json
cp connection-org1-with-org2.json connection-org1.json
```

**Option B: Keep existing (discovery will still work)**
- The backend will auto-discover Org2 if `FABRIC_DISCOVERY_ENABLED=true` (default)

---

## Step 2: Deploy Chaincode with Endorsement Policy

### Using the Helper Script (Easiest)

```bash
cd /mnt/d/chain_of_custody/fabric-samples/test-network
chmod +x ../../deploy-chaincode-with-policy.sh
../../deploy-chaincode-with-policy.sh
```

### Manual Deployment

```bash
cd /mnt/d/chain_of_custody/fabric-samples/test-network

# If network is already running, bring it down first
./network.sh down

# Start fresh network
./network.sh up createChannel

# Deploy with endorsement policy
./network.sh deployCC \
  -c mychannel \
  -ccn evidence \
  -ccp /mnt/d/chain_of_custody/chaincode/evidence/go \
  -ccl go \
  --signature-policy "AND('Org1MSP.peer','Org2MSP.peer')"
```

---

## Step 3: Verify Endorsement Policy

```bash
# Set environment for Org1
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Query the committed chaincode
peer lifecycle chaincode querycommitted -C mychannel -n evidence
```

**Expected output should include:**
```
Endorsement plugin: escc
Validation plugin: vscc
Endorsement: AND('Org1MSP.peer','Org2MSP.peer')
```

---

## Step 4: Test Single Peer (Should FAIL)

```bash
# Try with only Org1 peer
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  -C mychannel -n evidence \
  -c '{"Args":["CreateEvidence","TEST-FAIL","CASE-001","hashA","hashB","hashC","LOW"]}'
```

**Expected:** Error message about endorsement policy not satisfied

---

## Step 5: Test Both Peers (Should SUCCEED)

```bash
# Invoke with BOTH Org1 and Org2 peers
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
  --waitForEvent --waitForEventTimeout 30s \
  -C mychannel -n evidence \
  -c '{"Args":["CreateEvidence","TEST-SUCCESS","CASE-001","hashA","hashB","hashC","LOW"]}'
```

**Expected:** Transaction committed successfully on both peers

---

## Step 6: Verify Backend Works Automatically

```bash
cd /mnt/d/chain_of_custody/Kaaval_Backend

# Ensure discovery is enabled (check .env or default)
# FABRIC_DISCOVERY_ENABLED=true (default)
# FABRIC_AS_LOCALHOST=true (for local dev)

# Start backend
node app.js
```

**In another terminal, test the API:**

```bash
curl -X POST http://localhost:3000/evidence \
  -H "Content-Type: application/json" \
  -d '{
    "evidenceID": "API-TEST-001",
    "caseID": "CASE-001",
    "fileHash": "abc123",
    "metaHash": "def456",
    "riskLevel": "LOW"
  }'
```

**Expected:** Success response, transaction committed with both org approvals

---

## How It Works

### With Endorsement Policy Enabled:

1. **Backend submits transaction** via Fabric Gateway SDK
2. **SDK discovers** endorsement policy from chaincode definition
3. **SDK automatically sends** transaction proposal to BOTH Org1 and Org2 peers
4. **Both peers simulate** and endorse the transaction
5. **SDK collects** endorsement signatures from both orgs
6. **SDK submits** to orderer with dual endorsements
7. **Orderer sequences** and broadcasts to all peers
8. **Transaction commits** only if both orgs approved

### Why No Backend Code Changes Needed:

The Fabric Gateway SDK with **discovery enabled** automatically:
- Reads the endorsement policy from the chaincode
- Finds all required endorsing peers
- Sends proposals to all required peers
- Collects endorsements
- Submits with all necessary signatures

---

## Troubleshooting

### Issue: "endorsement policy failure"
**Solution:** Ensure both peers are running and accessible
```bash
docker ps | grep peer
# Should show peer0.org1 and peer0.org2 running
```

### Issue: Backend only connects to Org1
**Solution:** Enable discovery (already default)
```bash
# In Kaaval_Backend/.env
FABRIC_DISCOVERY_ENABLED=true
FABRIC_AS_LOCALHOST=true
```

### Issue: "Certificate verification failed"
**Solution:** Update Org2 certificate in connection profile
```bash
cd /mnt/d/chain_of_custody/Kaaval_Backend

# Get fresh Org2 certificate
cat /mnt/d/chain_of_custody/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

# Update connection-org1.json with correct certificate
```

### Issue: "Discovery failed"
**Solution:** Check network connectivity and peer addresses
```bash
# Test Org1 peer
curl -k https://localhost:7051
# Test Org2 peer  
curl -k https://localhost:9051
```

---

## Policy Variations

### Current: Both Required (AND)
```bash
--signature-policy "AND('Org1MSP.peer','Org2MSP.peer')"
```

### Alternative: Either One (OR)
```bash
--signature-policy "OR('Org1MSP.peer','Org2MSP.peer')"
```

### Future: Majority (OutOf)
```bash
# For 3+ orgs, require at least 2
--signature-policy "OutOf(2, 'Org1MSP.peer', 'Org2MSP.peer', 'Org3MSP.peer')"
```

---

## Verification Checklist

- [ ] Chaincode deployed with endorsement policy
- [ ] `peer lifecycle chaincode querycommitted` shows policy
- [ ] Single peer invoke fails with policy error
- [ ] Dual peer invoke succeeds
- [ ] Backend API can create evidence
- [ ] Backend console shows no endorsement errors
- [ ] Query shows evidence committed to both orgs

---

## Summary

✅ **Before:** Any single peer could write to blockchain  
✅ **After:** BOTH Org1 and Org2 must approve every write  
✅ **Backend:** Works automatically with discovery enabled  
✅ **Security:** Dual organizational control enforced  

---

## Next Steps

1. Follow the steps above to deploy with endorsement policy
2. Test the verification steps
3. Run your application through Kaaval_Backend
4. Monitor both org logs to see dual endorsement in action

For detailed explanation, see: [ENDORSEMENT_POLICY.md](ENDORSEMENT_POLICY.md)
