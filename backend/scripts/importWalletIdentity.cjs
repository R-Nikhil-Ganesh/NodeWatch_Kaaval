/**
 * backend/scripts/importWalletIdentity.cjs
 *
 * Packages the already-enrolled Org1 (Police) MSP identities that
 * `network.sh up createChannel -ca` generates on disk into the file-system
 * wallet the backend's fabricGatewayService.js reads (config.fabric.walletPath,
 * default: backend/wallet). Run after the test-network + addOrg3 are up.
 *
 * Usage (from backend/):
 *   node scripts/importWalletIdentity.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ORG_MSP_DIR = path.resolve(
  __dirname,
  '../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users'
);
const WALLET_DIR = path.resolve(__dirname, '../wallet');
const MSP_ID = 'Org1MSP';

function loadIdentityFromMsp(userDir) {
  const mspDir = path.join(ORG_MSP_DIR, userDir, 'msp');
  const certPath = path.join(mspDir, 'signcerts', 'cert.pem');
  const keystoreDir = path.join(mspDir, 'keystore');

  if (!fs.existsSync(certPath)) {
    throw new Error(`Certificate not found at ${certPath} — is the test-network actually up?`);
  }
  const certificate = fs.readFileSync(certPath, 'utf8');

  const keyFiles = fs.readdirSync(keystoreDir);
  if (!keyFiles.length) {
    throw new Error(`No private key found in ${keystoreDir}`);
  }
  const privateKey = fs.readFileSync(path.join(keystoreDir, keyFiles[0]), 'utf8');

  return {
    credentials: { certificate, privateKey },
    mspId: MSP_ID,
    type: 'X.509',
    version: 1,
  };
}

function writeWalletFile(label, identity) {
  if (!fs.existsSync(WALLET_DIR)) fs.mkdirSync(WALLET_DIR, { recursive: true });
  const outPath = path.join(WALLET_DIR, `${label}.id`);
  fs.writeFileSync(outPath, JSON.stringify(identity, null, 2));
  console.log(`Wrote ${outPath}`);
}

try {
  writeWalletFile('admin', loadIdentityFromMsp('Admin@org1.example.com'));
  writeWalletFile('appUser', loadIdentityFromMsp('User1@org1.example.com'));
  console.log('✅ Wallet identities imported from the running test-network.');
} catch (err) {
  console.error('❌ Import failed:', err.message);
  process.exit(1);
}
