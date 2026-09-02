# Troubleshooting Guide

## Common Issues & Solutions

### 🔴 Issue 1: "Cannot find module 'axios'"

**Error Message**:
```
Error: Cannot find module 'axios'
```

**Root Cause**: 
Axios package not installed in node_modules

**Solution**:
```bash
cd d:\chain_of_custody\Kaaval_Frontend
npm install axios
```

Or reinstall all dependencies:
```bash
npm install
```

**Verification**:
```bash
npm list axios
# Should show: axios@1.6.5 (or newer)
```

---

### 🔴 Issue 2: Backend Not Responding

**Error Message**:
```
Error: Network Error
connect ECONNREFUSED 127.0.0.1:3000
```

**Root Cause**: 
Backend is not running or not listening on port 3000

**Solution**:

**Step 1**: Check if backend is running
```bash
# In separate terminal
cd d:\chain_of_custody\Kaaval_Backend
npm start
# OR
node app.js
```

**Step 2**: Verify port 3000
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000
```

**Step 3**: Check firewall
- Windows Defender might block localhost
- Add Node.js to firewall exceptions

**Step 4**: Verify connection
```bash
# Try from command line
curl http://localhost:3000
# Should return 404 or error (not "connection refused")
```

---

### 🔴 Issue 3: Blockchain Connection Failed

**Error Message**:
```
Error: 2 UNKNOWN: error:0906D06C:PEM routines:PEM_read_bio:no start line
```

**Root Cause**: 
- Connection profile (connection-org1.json) not found
- Wallet not initialized
- Blockchain network not running

**Solution**:

**Step 1**: Verify connection profile exists
```bash
cd d:\chain_of_custody\Kaaval_Backend
ls -la connection-org1.json
# Should exist and not be empty
```

**Step 2**: Verify wallet directory
```bash
ls -la wallet/
# Should contain user enrollment files
```

**Step 3**: Start Fabric network
```bash
# Navigate to fabric-samples/test-network
cd d:\chain_of_custody\fabric-samples\test-network
./network.sh up createChannel -c mychannel
```

**Step 4**: Install and instantiate chaincode
```bash
./network.sh deployCC -ccn evidence -ccp ../chaincode/evidence/go
```

**Verification**:
```bash
# Test backend can connect
node app.js
# Should NOT show connection errors
```

---

### 🔴 Issue 4: Evidence Not Appearing on Blockchain

**Symptom**: 
Evidence creates locally but doesn't appear in blockchain

**Root Cause**: 
- Chaincode not properly installed
- Endorsement policy not met
- Transaction failed silently

**Solution**:

**Step 1**: Check chaincode status
```bash
cd d:\chain_of_custody\fabric-samples\test-network
peer lifecycle chaincode queryinstalled
# Should show 'evidence' chaincode
```

**Step 2**: Check backend logs
```
# In backend terminal, look for:
Submitting CreateEvidence: EV-[ID]
# If missing, transaction never sent
```

**Step 3**: Query ledger directly
```bash
# In fabric-samples/test-network
peer chaincode query -C mychannel -n evidence -c '{"function":"ReadEvidence","Args":["EV-xxx"]}'
# Should return evidence or "not found"
```

**Step 4**: Check endorsement
```bash
# Make sure endorsing peers are alive
docker ps | grep peer
# Should show peer0.org1.example.com and peer0.org2.example.com
```

---

### 🟡 Issue 5: App Crashes on Image Upload

**Error Message**:
```
Error: Cannot read property 'uri' of undefined
```

**Root Cause**: 
ImagePicker returned null or invalid asset

**Solution**:

**Step 1**: Check ImagePicker permissions
```typescript
// In EvidenceScreen.tsx, add:
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Permission Denied', 'Camera roll permission needed');
  return;
}
```

**Step 2**: Verify asset structure
```typescript
console.log('Image asset:', JSON.stringify(result.assets?.[0], null, 2));
// Should show: { uri, width, height, etc }
```

**Step 3**: Check file size
```typescript
if (asset.uri) {
  const size = await FileSystem.getInfoAsync(asset.uri);
  console.log('File size:', size.size);
  // File should exist
}
```

---

### 🟡 Issue 6: "API_BASE_URL is not set"

**Error Message**:
```
Error: API_BASE_URL is not a valid URL
```

**Root Cause**: 
API_BASE_URL not properly configured

**Solution**:

**Step 1**: Verify api.ts configuration
```typescript
// src/services/api.ts, Line 7
const API_BASE_URL = 'http://localhost:3000';

console.log('API Base URL:', API_BASE_URL);
// Should print: http://localhost:3000
```

**Step 2**: For production, use environment variables
```typescript
const API_BASE_URL = process.env.REACT_NATIVE_API_URL || 'http://localhost:3000';
```

**Step 3**: Create .env file
```bash
# .env
REACT_NATIVE_API_URL=http://localhost:3000
```

---

### 🟡 Issue 7: "Case not found" Error

**Error Message**:
```
Error: Case not found
```

**Root Cause**: 
- Case ID doesn't exist on blockchain
- Case created but not synced
- Wrong case ID being queried

**Solution**:

**Step 1**: Verify case exists locally
```typescript
// In DashboardScreen
console.log('All cases:', cases);
// Should show the case you created
```

**Step 2**: Check blockchain
```bash
# Query blockchain directly
peer chaincode query -C mychannel -n evidence \
  -c '{"function":"QueryByCaseID","Args":["CASE-2025-123"]}'
# Should return case data
```

**Step 3**: For new cases, wait for sync
```typescript
// Add delay before querying blockchain
setTimeout(() => {
  // Try to fetch from blockchain
}, 1000);
```

---

### 🟡 Issue 8: PDF Generation Fails

**Error Message**:
```
Error: Failed to generate PDF
```

**Root Cause**: 
- HTML content has syntax errors
- Insufficient memory
- expo-print module issue

**Solution**:

**Step 1**: Check HTML content
```typescript
// Add validation before printing
const validateHtml = (html) => {
  return html && html.includes('<!DOCTYPE') && html.includes('</html>');
};
```

**Step 2**: Simplify PDF content
```typescript
// For debugging, use minimal HTML first
const minimalHtml = '<html><body><p>Test PDF</p></body></html>';
await Print.printToFileAsync({ html: minimalHtml });
```

**Step 3**: Check file permissions
```typescript
// Ensure file write permissions exist
const { status } = await FileSystem.requestDirectoryPermissionsAsync();
```

---

### 🟡 Issue 9: "Too many requests" Error

**Error Message**:
```
Error: 429 Too Many Requests
```

**Root Cause**: 
Rate limiting triggered (hitting API too many times)

**Solution**:

**Step 1**: Add debouncing
```typescript
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const debouncedUpload = debounce(updateCaseEvidence, 1000);
```

**Step 2**: Implement request queuing
```typescript
const queue = [];
const processQueue = async () => {
  while (queue.length > 0) {
    const request = queue.shift();
    await request();
    await new Promise(r => setTimeout(r, 100)); // Delay between requests
  }
};
```

**Step 3**: Configure rate limiting on backend
```javascript
// app.js
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
```

---

### 🟡 Issue 10: AsyncStorage Data Lost

**Symptom**: 
App data disappears after restart

**Root Cause**: 
AsyncStorage cleared or permission issues

**Solution**:

**Step 1**: Verify AsyncStorage permissions
```typescript
// src/context/AppContext.tsx
useEffect(() => {
  console.log('Loading from AsyncStorage...');
  loadData();
}, []);
```

**Step 2**: Debug storage
```typescript
const debugStorage = async () => {
  const keys = await AsyncStorage.getAllKeys();
  console.log('Keys in storage:', keys);
  
  if (keys.includes('cases')) {
    const cases = await AsyncStorage.getItem('cases');
    console.log('Cases:', JSON.parse(cases));
  }
};
```

**Step 3**: Force save on app close
```typescript
useEffect(() => {
  return () => {
    // Save on unmount
    AsyncStorage.setItem('cases', JSON.stringify(cases));
  };
}, [cases]);
```

---

## Network Debugging

### Check Backend Connectivity
```bash
# Test basic connection
curl -X GET http://localhost:3000

# Test with timeout
curl -X GET http://localhost:3000 --max-time 5

# Test POST request
curl -X POST http://localhost:3000/evidence \
  -H "Content-Type: application/json" \
  -d '{"evidenceID":"test","caseID":"CASE-1","fileHash":"hash","metaHash":"meta","riskLevel":"low"}'
```

### Check Blockchain Connectivity
```bash
# From fabric-samples/test-network directory

# List peers
docker ps | grep peer

# Check logs
docker logs peer0.org1.example.com | tail -50

# Check orderer
docker logs orderer.example.com | tail -50

# Check chaincode
peer lifecycle chaincode queryinstalled
```

---

## Performance Debugging

### Check API Response Time
```typescript
const startTime = Date.now();
const result = await apiService.createEvidence(...);
const duration = Date.now() - startTime;
console.log(`Request took ${duration}ms`);
```

### Monitor Memory Usage
```bash
# Frontend (Android)
adb shell dumpsys meminfo | grep TOTAL

# Backend
node --inspect=0.0.0.0:9229 app.js
# Then visit chrome://inspect
```

### Check Network Traffic
```bash
# Windows - using fiddler or Charles
# Or use curl with verbose
curl -v http://localhost:3000
```

---

## Reset & Recovery

### Reset Frontend Data
```bash
# Clear all AsyncStorage data
AsyncStorage.multiRemove(['cases', 'users']).then(() => {
  alert('Data cleared. Restart app.');
});
```

### Reset Backend
```bash
# Restart fresh
cd Kaaval_Backend
rm -rf wallet/  # Clear old identity
npm install
node app.js
```

### Reset Blockchain Network
```bash
cd d:\chain_of_custody\fabric-samples\test-network

# Teardown
./network.sh down

# Start fresh
./network.sh up createChannel -c mychannel
./network.sh deployCC -ccn evidence -ccp ../chaincode/evidence/go
```

---

## Getting Help

### Check Logs

**Frontend Logs**:
```
Android: adb logcat | grep ReactNative
iOS: Console.app
Web: Browser DevTools (F12)
```

**Backend Logs**:
```
Check terminal where `node app.js` is running
Look for ERROR lines and stack traces
```

**Blockchain Logs**:
```bash
docker logs peer0.org1.example.com
docker logs orderer.example.com
```

### Enable Debug Mode
```typescript
// src/services/api.ts
const DEBUG = true;

async createEvidence(...) {
  if (DEBUG) console.log('[API] Creating evidence...');
  // ...
}
```

### Create Minimal Test Case
```typescript
// Test just the API call
import { apiService } from './src/services/api';

const testApi = async () => {
  try {
    const result = await apiService.createEvidence(
      'TEST-EV-123',
      'TEST-CASE-123',
      '0xhash',
      '0xmeta',
      'test'
    );
    console.log('✓ API Works:', result);
  } catch (err) {
    console.error('✗ API Failed:', err);
  }
};
```

---

## Quick Fix Checklist

When something breaks:
1. [ ] Check backend is running
2. [ ] Check blockchain network is running
3. [ ] Check API_BASE_URL is correct
4. [ ] Check latest logs in both frontend and backend
5. [ ] Try restarting backend
6. [ ] Try restarting frontend
7. [ ] Try restarting blockchain network
8. [ ] Check npm modules are installed
9. [ ] Clear browser cache / app data
10. [ ] Review error message carefully

---

## Contact Support

If issues persist:
1. Check [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)
2. Review [ARCHITECTURE.md](ARCHITECTURE.md)
3. Check [API_INTEGRATION_GUIDE.md](API_INTEGRATION_GUIDE.md)
4. Review error logs completely
5. Document the issue with screenshots
6. Include console logs in your report

---

**Last Updated**: January 2025
**Integration Version**: 1.0.0
**Status**: Production Ready ✓
