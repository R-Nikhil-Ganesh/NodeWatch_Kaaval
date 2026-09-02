# Endorsement Policy Configuration

## Overview
This document explains how to configure the chaincode to require approval from both Org1MSP and Org2MSP before writing to the blockchain.

## What is an Endorsement Policy?
An endorsement policy specifies which organizations must approve (endorse) a transaction before it can be committed to the blockchain. This ensures that no single organization can unilaterally write data.

## Current Status
The chaincode is deployed **without** a specific endorsement policy, which means it may only require endorsement from the submitting organization.

## Solution: Deploy with Endorsement Policy

### Method 1: Signature Policy (Recommended)
When deploying the chaincode, add the `--signature-policy` flag to require both organizations:

```bash
cd /mnt/d/chain_of_custody/fabric-samples/test-network

# Deploy with endorsement policy requiring both Org1 AND Org2
./network.sh deployCC \
  -c mychannel \
  -ccn evidence \
  -ccp /mnt/d/chain_of_custody/chaincode/evidence/go \
  -ccl go \
  --signature-policy "AND('Org1MSP.peer','Org2MSP.peer')"
```

### Method 2: Channel Config Policy
Alternatively, use a channel configuration policy:

```bash
./network.sh deployCC \
  -c mychannel \
  -ccn evidence \
  -ccp /mnt/d/chain_of_custody/chaincode/evidence/go \
  -ccl go \
  --channel-config-policy "Channel/Application/Endorsement"
```

## Verification

After deployment, verify the policy is active by:

1. **Check the committed chaincode definition:**
```bash
peer lifecycle chaincode querycommitted -C mychannel -n evidence
```

2. **Test with single peer (should FAIL):**
```bash
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile /mnt/d/chain_of_custody/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles /mnt/d/chain_of_custody/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  -C mychannel -n evidence \
  -c '{"Args":["CreateEvidence","TEST-001","CASE-001","hashA","hashB","hashC","LOW"]}'
```
**Expected:** Error - endorsement policy not satisfied

3. **Test with both peers (should SUCCEED):**
```bash
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile /mnt/d/chain_of_custody/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles /mnt/d/chain_of_custody/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles /mnt/d/chain_of_custody/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
  -C mychannel -n evidence \
  -c '{"Args":["CreateEvidence","TEST-002","CASE-001","hashA","hashB","hashC","LOW"]}'
```
**Expected:** Success - transaction committed

## Backend Application Configuration

The `Kaaval_Backend/app.js` already connects through the Fabric Gateway, which automatically handles multi-peer endorsement when the chaincode has an endorsement policy configured.

**No changes needed to the backend code** - the Fabric SDK will automatically:
1. Discover the endorsement policy from the chaincode
2. Send the proposal to all required peers
3. Collect endorsements from Org1 and Org2
4. Submit the transaction only when both have approved

## Important Notes

1. **Redeploy Required**: You must redeploy the chaincode with the endorsement policy. Use sequence increment:
   ```bash
   ./network.sh deployCC \
     -c mychannel \
     -ccn evidence \
     -ccp /mnt/d/chain_of_custody/chaincode/evidence/go \
     -ccl go \
     --signature-policy "AND('Org1MSP.peer','Org2MSP.peer')" \
     -ccv 1.1  # Increment version
   ```

2. **Policy Types:**
   - `AND('Org1MSP.peer','Org2MSP.peer')` - BOTH must approve
   - `OR('Org1MSP.peer','Org2MSP.peer')` - EITHER can approve
   - `OutOf(2, 'Org1MSP.peer', 'Org2MSP.peer', 'Org3MSP.peer')` - At least 2 out of 3

3. **Discovery Enabled**: Make sure `FABRIC_DISCOVERY_ENABLED=true` in Kaaval_Backend/.env so the SDK can find all required endorsing peers

## Deployment Steps

1. **Stop the network (if needed):**
   ```bash
   cd /mnt/d/chain_of_custody/fabric-samples/test-network
   ./network.sh down
   ```

2. **Start fresh network:**
   ```bash
   ./network.sh up createChannel
   ```

3. **Deploy with endorsement policy:**
   ```bash
   ./network.sh deployCC \
     -c mychannel \
     -ccn evidence \
     -ccp /mnt/d/chain_of_custody/chaincode/evidence/go \
     -ccl go \
     --signature-policy "AND('Org1MSP.peer','Org2MSP.peer')"
   ```

4. **Verify backend connection:**
   ```bash
   cd /mnt/d/chain_of_custody/Kaaval_Backend
   node app.js
   ```

## Troubleshooting

### "Endorsement policy failure"
- Ensure both peer addresses are included in invocation
- Check that both organizations' peers are running
- Verify the policy syntax is correct

### "Discovery failed"
- Set `FABRIC_DISCOVERY_ENABLED=true` in backend .env
- Ensure connection profile includes both Org1 and Org2 peers

### Backend only connects to Org1
- The backend connects as Org1, but the SDK's discovery mechanism will automatically find Org2 peers
- Verify `connection-org1.json` has correct peer addresses
- Check that `asLocalhost: true` is set for local development

## References
- [Hyperledger Fabric Endorsement Policies](https://hyperledger-fabric.readthedocs.io/en/latest/endorsement-policies.html)
- [Fabric SDK Node Documentation](https://hyperledger.github.io/fabric-sdk-node/)
