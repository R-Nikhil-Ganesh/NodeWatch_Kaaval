// API INTEGRATION GUIDE
// ========================

## What Was Integrated

Your Kaaval Frontend is now fully integrated with your Kaaval Backend API!

### 1. API Service Layer (`src/services/api.ts`)
- Created a centralized API service with axios
- All endpoints from your backend are wrapped:
  - `POST /evidence` → `createEvidence()`
  - `GET /evidence/:id` → `readEvidence()`
  - `GET /evidence/history/:id` → `getEvidenceHistory()`
  - `GET /case/:id` → `queryCaseEvidence()`
  - `POST /transfer/request` → `requestTransfer()`
  - `POST /transfer/accept` → `acceptTransfer()`

### 2. Context Integration (`src/context/AppContext.tsx`)
- Added `loading` and `error` states for API operations
- `addCase()` now syncs new cases with blockchain
- `updateCaseEvidence()` now sends evidence to blockchain via API

### 3. Screen Updates
- **CreateCaseScreen**: Shows loading indicator while creating case
- **EvidenceScreen**: Uploads evidence to blockchain with proper error handling
- **DashboardScreen**: Displays API errors to users

## Setup Instructions

### Step 1: Install Dependencies
```bash
cd d:\chain_of_custody\Kaaval_Frontend
npm install
```

### Step 2: Configure API URL
Edit `src/services/api.ts` and update the API_BASE_URL if needed:
```typescript
const API_BASE_URL = 'http://localhost:3000'; // Change if different
```

### Step 3: Start Both Services

**Terminal 1 - Backend (Node.js)**
```bash
cd d:\chain_of_custody\Kaaval_Backend
npm install
node app.js
```

**Terminal 2 - Frontend (Expo)**
```bash
cd d:\chain_of_custody\Kaaval_Frontend
npm start
```

Then choose:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web browser

## Features Now Available

### Create Case
1. Open app and login
2. Tap "New Case" button
3. Enter title and location
4. Case is now registered on Hyperledger Fabric blockchain!

### Upload Evidence
1. Open any case
2. Tap "Camera" or "Upload" button
3. Select/take photo
4. Evidence is automatically:
   - Hashed
   - Registered on blockchain
   - Added to chain of custody

### Check Audit Trail
- All evidence uploads create immutable blockchain records
- The blockchain hash is displayed in the ledger card

## Error Handling

The app now includes:
- Loading spinners during API calls
- Error alerts for failed operations
- Graceful fallback to local storage if API is unavailable
- Console logging for debugging

## Testing

### Test Create Case
1. Create a new case
2. Check backend console for: `Submitting CreateEvidence`

### Test Upload Evidence
1. Upload evidence in a case
2. Check backend console for the evidence registration

### Test History
If you add the history endpoint to frontend, you'll see audit trail!

## Next Steps (Optional Enhancements)

1. Add Transfer Request functionality to UI
2. Implement evidence history viewer
3. Add real file upload with multipart/form-data
4. Implement real authentication with blockchain
5. Add real GPS location instead of mock locations

## Troubleshooting

**Issue: "Network error" when uploading**
- Ensure backend is running on port 3000
- Check API_BASE_URL in src/services/api.ts
- Verify firewall allows localhost:3000

**Issue: "Case not found on blockchain"**
- This is expected for new cases (first sync)
- The blockchain eventually becomes consistent

**Issue: Evidence not showing in blockchain**
- Check that backend has chaincode deployed
- Verify caseId matches between frontend and blockchain

## Architecture

```
Frontend (React Native/Expo)
    ↓
API Service Layer (axios)
    ↓
Express Backend (Node.js)
    ↓
Hyperledger Fabric Network
    ↓
Blockchain Ledger
```

## Files Modified

- `src/services/api.ts` (NEW)
- `src/context/AppContext.tsx` (UPDATED)
- `src/screens/CreateCaseScreen.tsx` (UPDATED)
- `src/screens/EvidenceScreen.tsx` (UPDATED)
- `src/screens/DashboardScreen.tsx` (UPDATED)
- `package.json` (ADDED axios)

---

Your app is now blockchain-integrated! 🚀
