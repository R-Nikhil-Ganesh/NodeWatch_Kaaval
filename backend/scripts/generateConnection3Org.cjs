/**
 * backend/scripts/generateConnection3Org.cjs
 *
 * Builds backend/src/config/connection-3org.json from the test-network's own
 * freshly-generated per-org connection profiles (connection-org1/2/3.json,
 * produced by organizations/ccp-generate.sh and addOrg3/ccp-generate.sh) plus
 * the orderer's TLS CA cert. The previous hand-assembled connection-3org.json
 * had org1's peer/CA certs copy-pasted onto the org3 entries and no orderer
 * definition at all, so every commit failed with "Committer must be
 * connectable". Run this any time the test-network's crypto material is
 * regenerated (i.e. after `network.sh up` / `addOrg3.sh up`).
 *
 * Usage (from backend/):
 *   node scripts/generateConnection3Org.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TEST_NETWORK = path.resolve(__dirname, '../../fabric-samples/test-network');
const OUT_PATH = path.resolve(__dirname, '../src/config/connection-3org.json');

function readOrgProfile(n) {
  const p = path.join(TEST_NETWORK, 'organizations/peerOrganizations', `org${n}.example.com`, `connection-org${n}.json`);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing ${p} — run organizations/ccp-generate.sh (org1/2) and addOrg3/ccp-generate.sh (org3) first.`);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const ordererTlsCaPath = path.join(TEST_NETWORK, 'organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem');
if (!fs.existsSync(ordererTlsCaPath)) {
  throw new Error(`Missing ${ordererTlsCaPath} — is the test-network actually up?`);
}
const ordererTlsCaCert = fs.readFileSync(ordererTlsCaPath, 'utf8');

const org1 = readOrgProfile(1);
const org2 = readOrgProfile(2);
const org3 = readOrgProfile(3);

const merged = {
  name: 'kaaval-consortium-3org',
  version: '1.0.0',
  client: {
    organization: 'Org1',
    connection: { timeout: { peer: { endorser: '300' }, orderer: '300' } },
  },
  channels: {
    mychannel: {
      orderers: ['orderer.example.com'],
      peers: {
        'peer0.org1.example.com': { endorsingPeer: true, chaincodeQuery: true, ledgerQuery: true, eventSource: true },
        'peer0.org2.example.com': { endorsingPeer: true, chaincodeQuery: true, ledgerQuery: true, eventSource: true },
        'peer0.org3.example.com': { endorsingPeer: true, chaincodeQuery: true, ledgerQuery: true, eventSource: true },
      },
    },
  },
  organizations: {
    Org1: { mspid: 'Org1MSP', peers: ['peer0.org1.example.com'], certificateAuthorities: ['ca.org1.example.com'] },
    Org2: { mspid: 'Org2MSP', peers: ['peer0.org2.example.com'], certificateAuthorities: ['ca.org2.example.com'] },
    Org3: { mspid: 'Org3MSP', peers: ['peer0.org3.example.com'], certificateAuthorities: ['ca.org3.example.com'] },
  },
  orderers: {
    'orderer.example.com': {
      url: 'grpcs://localhost:7050',
      tlsCACerts: { pem: ordererTlsCaCert },
      grpcOptions: {
        'ssl-target-name-override': 'orderer.example.com',
        hostnameOverride: 'orderer.example.com',
      },
    },
  },
  peers: {
    'peer0.org1.example.com': org1.peers['peer0.org1.example.com'],
    'peer0.org2.example.com': org2.peers['peer0.org2.example.com'],
    'peer0.org3.example.com': org3.peers['peer0.org3.example.com'],
  },
  certificateAuthorities: {
    'ca.org1.example.com': org1.certificateAuthorities['ca.org1.example.com'],
    'ca.org2.example.com': org2.certificateAuthorities['ca.org2.example.com'],
    'ca.org3.example.com': org3.certificateAuthorities['ca.org3.example.com'],
  },
};

fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2));
console.log(`✅ Wrote ${OUT_PATH}`);
