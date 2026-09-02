import fs from 'fs';
import path from 'path';
import pkg from 'fabric-network';
const { Gateway, Wallets } = pkg;
import { config } from '../config/index.js';

let _cachedGateway = null;
let _cachedContract = null;

export const fabricGatewayService = {
  /**
   * Connects to Hyperledger Fabric Network via Gateway
   */
  async getContract() {
    if (config.fabric.disabled) {
      throw new Error('Fabric integration is disabled via configuration');
    }

    if (_cachedContract) {
      return { gateway: _cachedGateway, contract: _cachedContract };
    }

    const ccpPath = config.fabric.connectionProfilePath;
    if (!fs.existsSync(ccpPath)) {
      throw new Error(`Connection profile not found at ${ccpPath}`);
    }

    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(config.fabric.walletPath);

    const identityExists = await wallet.get(config.fabric.defaultIdentity);
    if (!identityExists) {
      throw new Error(`Identity '${config.fabric.defaultIdentity}' not found in wallet at ${config.fabric.walletPath}`);
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: config.fabric.defaultIdentity,
      discovery: {
        enabled: config.fabric.discoveryEnabled,
        asLocalhost: config.fabric.asLocalhost,
      },
    });

    const network = await gateway.getNetwork(config.fabric.channelName);
    const contract = network.getContract(config.fabric.chaincodeName);

    _cachedGateway = gateway;
    _cachedContract = contract;

    return { gateway, contract };
  },

  /**
   * Submit transaction to ledger (Endorsement + Ordering + Commit)
   */
  async submitTransaction(funcName, ...args) {
    const { contract } = await this.getContract();
    const stringArgs = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg ?? '')));
    const resultBuffer = await contract.submitTransaction(funcName, ...stringArgs);
    const resultStr = resultBuffer.toString('utf8');
    return resultStr ? JSON.parse(resultStr) : null;
  },

  /**
   * Evaluate transaction (Query read-only without committing a transaction)
   */
  async evaluateTransaction(funcName, ...args) {
    const { contract } = await this.getContract();
    const stringArgs = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg ?? '')));
    const resultBuffer = await contract.evaluateTransaction(funcName, ...stringArgs);
    const resultStr = resultBuffer.toString('utf8');
    return resultStr ? JSON.parse(resultStr) : null;
  },

  /**
   * Health check for Fabric connection
   */
  async checkHealth() {
    if (config.fabric.disabled) {
      return { connected: false, disabled: true };
    }
    try {
      const { contract } = await this.getContract();
      await contract.evaluateTransaction('GetEvidence', 'HEALTH_CHECK_DUMMY_KEY');
      return { connected: true, disabled: false };
    } catch (e) {
      // If error is evidence not found, the connection to chaincode is active!
      if (e.message && e.message.includes('does not exist')) {
        return { connected: true, disabled: false };
      }
      return { connected: false, disabled: false, error: e.message };
    }
  }
};
