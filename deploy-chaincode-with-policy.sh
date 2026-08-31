#!/bin/bash

# Deploy Chaincode with Endorsement Policy
# This script deploys the evidence chaincode with a policy requiring both Org1 and Org2 approval

set -e

echo "================================================"
echo "Deploying Evidence Chaincode with Endorsement Policy"
echo "================================================"
echo ""
echo "Policy: AND('Org1MSP.peer','Org2MSP.peer')"
echo "This requires BOTH organizations to approve transactions"
echo ""

# Check if we're in the test-network directory
if [ ! -f "./network.sh" ]; then
    echo "Error: This script must be run from the test-network directory"
    echo "cd /mnt/d/chain_of_custody/fabric-samples/test-network"
    exit 1
fi

# Get the chaincode path
CHAINCODE_PATH="/mnt/d/chain_of_custody/chaincode/evidence/go"

if [ ! -d "$CHAINCODE_PATH" ]; then
    echo "Error: Chaincode not found at $CHAINCODE_PATH"
    exit 1
fi

echo "Chaincode path: $CHAINCODE_PATH"
echo ""

# Deploy the chaincode with endorsement policy
echo "Deploying chaincode..."
./network.sh deployCC \
  -c mychannel \
  -ccn evidence \
  -ccp "$CHAINCODE_PATH" \
  -ccl go \
  --signature-policy "AND('Org1MSP.peer','Org2MSP.peer')"

echo ""
echo "================================================"
echo "Deployment Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Verify the endorsement policy:"
echo "   peer lifecycle chaincode querycommitted -C mychannel -n evidence"
echo ""
echo "2. Test with single peer (should fail):"
echo "   peer chaincode invoke -C mychannel -n evidence \\"
echo "     --peerAddresses localhost:7051 \\"
echo "     --tlsRootCertFiles \$ORG1_TLS_CERT \\"
echo "     -c '{\"Args\":[\"CreateEvidence\",\"TEST-1\",\"CASE-1\",\"h1\",\"h2\",\"h3\",\"LOW\"]}'"
echo ""
echo "3. Test with both peers (should succeed):"
echo "   peer chaincode invoke -C mychannel -n evidence \\"
echo "     --peerAddresses localhost:7051 \\"
echo "     --tlsRootCertFiles \$ORG1_TLS_CERT \\"
echo "     --peerAddresses localhost:9051 \\"
echo "     --tlsRootCertFiles \$ORG2_TLS_CERT \\"
echo "     -c '{\"Args\":[\"CreateEvidence\",\"TEST-2\",\"CASE-1\",\"h1\",\"h2\",\"h3\",\"LOW\"]}'"
echo ""
echo "4. Start the backend:"
echo "   cd /mnt/d/chain_of_custody/Kaaval_Backend"
echo "   node app.js"
echo ""
echo "The backend will automatically use both peers when discovery is enabled."
echo ""
