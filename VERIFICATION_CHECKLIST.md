# Integration Verification Checklist ✓

## Pre-Flight Checks

### Frontend Setup
- [ ] Navigate to `Kaaval_Frontend` directory
- [ ] Run `npm install` to install dependencies (including new axios)
- [ ] Verify `.env` is configured (or use defaults)
- [ ] Check `src/services/api.ts` exists
- [ ] Check API_BASE_URL is set to `http://localhost:3000`

### Backend Setup
- [ ] Navigate to `Kaaval_Backend` directory
- [ ] Run `npm install` to install dependencies
- [ ] Verify `connection-org1.json` exists
- [ ] Verify `wallet/` directory exists
- [ ] Verify `app.js` is configured for port 3000
- [ ] Hyperledger Fabric network is running
  - [ ] Peers are up
  - [ ] Orderer is up
  - [ ] Channel `mychannel` exists
  - [ ] Chaincode `evidence` is installed & instantiated

### Network Configuration
- [ ] Backend can connect to Fabric network
- [ ] Test: `node app.js` starts without connection errors
- [ ] Frontend API endpoint is `http://localhost:3000`

---

## Functionality Tests

### Test 1: Create Case
**Objective**: Verify case creation syncs with blockchain

**Steps**:
1. [ ] Start backend: `node app.js` in Kaaval_Backend
2. [ ] Start frontend: `npm start` in Kaaval_Frontend
3. [ ] Login with a test user
4. [ ] Tap "New Case" button
5. [ ] Enter case title and location
6. [ ] Tap "Create Case Block"
7. [ ] Watch for loading spinner
8. [ ] Verify success alert appears

**Expected Results**:
- [ ] Case appears in Active Cases
- [ ] Blockchain hash is displayed
- [ ] Backend console shows: `Submitting CreateEvidence: [caseId]`
- [ ] No errors in frontend or backend consoles

**Backend Verification**:
```bash
# Check backend console for:
API running on http://localhost:3000
Submitting CreateEvidence: CASE-2025-[number]
```

---

### Test 2: Upload Evidence
**Objective**: Verify evidence upload syncs with blockchain

**Steps**:
1. [ ] Open a case from dashboard
2. [ ] Tap "Camera" or "Upload" button
3. [ ] Select/take a photo
4. [ ] Wait for "Syncing with Blockchain" alert
5. [ ] Watch for loading spinner
6. [ ] Verify success alert appears

**Expected Results**:
- [ ] Evidence appears in case evidence list
- [ ] Evidence hash is displayed
- [ ] Timestamp is shown
- [ ] Backend console shows evidence registration
- [ ] No errors in consoles

**Backend Verification**:
```bash
# Check backend console for:
Submitting CreateEvidence: EV-[timestamp]-[random]
```

---

### Test 3: View Case Details
**Objective**: Verify case data persists and displays correctly

**Steps**:
1. [ ] Navigate to a case
2. [ ] View the ledger card showing blockchain hash
3. [ ] See evidence list with hashes
4. [ ] Verify timestamps are correct

**Expected Results**:
- [ ] All data displays correctly
- [ ] No loading delays
- [ ] Blockchain hash matches what was created

---

### Test 4: Download PDF Report
**Objective**: Verify PDF generation with blockchain data

**Steps**:
1. [ ] Open a case with evidence
2. [ ] Tap "Download Report" button
3. [ ] Wait for PDF generation
4. [ ] Verify PDF downloads/opens

**Expected Results**:
- [ ] PDF generates successfully
- [ ] Contains case information
- [ ] Shows all evidence with hashes
- [ ] Includes blockchain ledger record

---

### Test 5: Error Handling
**Objective**: Verify graceful error handling

**Steps**:
1. [ ] Stop backend while frontend is running
2. [ ] Try to create a new case
3. [ ] Observe error handling
4. [ ] Restart backend
5. [ ] Verify normal operation resumes

**Expected Results**:
- [ ] User sees error alert
- [ ] App doesn't crash
- [ ] User can retry after backend restarts
- [ ] Console shows proper error messages

---

### Test 6: Offline Fallback
**Objective**: Verify app works when API unavailable

**Steps**:
1. [ ] Backend running
2. [ ] Create and upload evidence
3. [ ] Stop backend
4. [ ] Restart frontend
5. [ ] Verify data is still there (from AsyncStorage)
6. [ ] Restart backend
7. [ ] Try to upload new evidence

**Expected Results**:
- [ ] Data persists in AsyncStorage
- [ ] App functions with local data
- [ ] Can retry sync when backend returns

---

## Code Quality Tests

### Frontend Code Review
- [ ] `src/services/api.ts` - API service properly structured
- [ ] `src/context/AppContext.tsx` - Context provides loading & error states
- [ ] `src/screens/*.tsx` - All screens use useApp() hook
- [ ] No console errors when running
- [ ] No TypeScript errors

**Check with**:
```bash
npm run lint
```

### Backend Code Review
- [ ] `app.js` has all required routes
- [ ] Error handling for API calls
- [ ] Proper async/await usage
- [ ] No hardcoded credentials
- [ ] Connection pool management

**Check with**:
```bash
npm run lint  # if available
node app.js   # test startup
```

---

## Integration Tests

### Test: Complete Case Lifecycle
1. [ ] Create case on blockchain
2. [ ] Upload multiple evidence items
3. [ ] Verify all blockchain hashes are unique
4. [ ] Download PDF report
5. [ ] Close and reopen case
6. [ ] Verify data persistence

**Success Criteria**:
- ✓ All operations succeed
- ✓ No data loss
- ✓ Blockchain records are immutable
- ✓ Hash values persist across sessions

---

## Performance Tests

### Response Time Tests
- [ ] Create case: < 5 seconds
- [ ] Upload evidence: < 10 seconds
- [ ] List cases: < 2 seconds
- [ ] Generate PDF: < 15 seconds

### Stress Tests
- [ ] Create 10 cases in succession: No failures
- [ ] Upload 10 evidence items in one case: No failures
- [ ] Concurrent requests: Handle gracefully

---

## Security Checklist

### Frontend Security
- [ ] No API keys hardcoded
- [ ] HTTPS configured for production
- [ ] No sensitive data in localStorage
- [ ] Authentication working properly
- [ ] Biometric auth functioning

### Backend Security
- [ ] No hardcoded passwords
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak info
- [ ] Wallet access is secure

### Data Security
- [ ] Evidence hashes are cryptographic
- [ ] Blockchain provides immutability
- [ ] All records timestamped
- [ ] No data can be modified after blockchain entry

---

## Documentation Checks

- [ ] `API_INTEGRATION_GUIDE.md` is clear and complete
- [ ] `ARCHITECTURE.md` explains system design
- [ ] `INTEGRATION_SUMMARY.md` covers all changes
- [ ] `.env.example` shows configuration options
- [ ] Code comments explain key functions

---

## Deployment Readiness

### Before Production Deployment

**Frontend**:
- [ ] API_BASE_URL points to production backend
- [ ] HTTPS is enabled
- [ ] Error tracking (Sentry) configured
- [ ] Analytics configured
- [ ] No debug logging in production

**Backend**:
- [ ] Port configuration matches frontend
- [ ] CORS only allows production domain
- [ ] JWT secret is strong and secure
- [ ] Rate limiting is configured
- [ ] Error logging is comprehensive

**Blockchain**:
- [ ] Network is properly secured (TLS)
- [ ] Orderer quorum is appropriate
- [ ] Backup/recovery plan exists
- [ ] Monitoring is in place

---

## Troubleshooting Quick Reference

### Issue: "Cannot GET http://localhost:3000/"
**Solution**: 
- Ensure backend is running: `node app.js` in Kaaval_Backend
- Check port 3000 is not blocked by firewall
- Verify no other service on port 3000

### Issue: "Network error" when uploading
**Solution**:
- Check backend console for errors
- Verify blockchain network is running
- Try with simpler evidence (just text)
- Check internet connectivity

### Issue: "Cannot find module 'axios'"
**Solution**:
```bash
cd Kaaval_Frontend
npm install
```

### Issue: Blockchain connection failed
**Solution**:
- Verify Fabric network is up: `docker ps`
- Check connection-org1.json exists
- Verify wallet directory has correct user
- Check chaincode is installed: `peer lifecycle chaincode queryinstalled`

### Issue: Evidence not appearing on blockchain
**Solution**:
- Check backend console for transaction status
- Verify chaincode endorsement policy met
- Check ledger state with: `peer chaincode query`
- Review blockchain logs

---

## Sign-Off

**Frontend Integration Status**: _______________
- [ ] READY FOR TESTING
- [ ] READY FOR STAGING
- [ ] READY FOR PRODUCTION

**Backend Integration Status**: _______________
- [ ] READY FOR TESTING
- [ ] READY FOR STAGING
- [ ] READY FOR PRODUCTION

**Blockchain Status**: _______________
- [ ] READY FOR TESTING
- [ ] READY FOR STAGING
- [ ] READY FOR PRODUCTION

**Integration Date**: _______________________

**Tested By**: _______________________

**Notes**: 
_________________________________________________________________
_________________________________________________________________

---

## Next Steps After Verification

✅ All tests passed?
1. [ ] Deploy to staging environment
2. [ ] Conduct user acceptance testing
3. [ ] Performance testing with load
4. [ ] Security audit
5. [ ] Deploy to production

❌ Tests failed?
1. [ ] Review error logs
2. [ ] Identify root cause
3. [ ] Fix issues
4. [ ] Re-run failed tests
5. [ ] Document lessons learned

---

**Remember**: A successful integration means:
- ✓ Frontend and backend communicate correctly
- ✓ Data flows to blockchain
- ✓ Immutable records are created
- ✓ Users can see blockchain hashes
- ✓ System handles errors gracefully
- ✓ Data persists across sessions
