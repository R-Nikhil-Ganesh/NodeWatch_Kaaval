# Kaaval — Testing Guide

Covers the mobile app (`frontend_mobile`), the backend it talks to (`backend`), and cross-system checks.
Status legend used in the tables: **A** = automated (a command you run), **M** = manual.

> Maintenance rule: after every major change, add/extend an automated suite and the matching manual rows here.

---

## 0. Setup

| Need | How |
|---|---|
| Backend + DB + MinIO | `start-all.bat` (or `docker-compose up`, then `cd backend && npm start`). Confirm: `curl localhost:4000/health` → `database: connected` |
| Test users | `police1` / `password123`, `forensic1` / `password123` (seeded; see `backend/scripts/seed.cjs`) |
| Mobile → backend URL | `frontend_mobile/.env`: `EXPO_PUBLIC_API_BASE_URL=http://<your-LAN-IP>:4000` (a phone cannot use `localhost`; Android emulator uses `10.0.2.2`) |
| Run the app | `cd frontend_mobile && npx expo start` (use a **dev build** to test permission prompts; Expo Go skips the custom permission text) |
| Demo OTP | `1234` (hardcoded mock — not real MFA) |

---

## 1. Automated checks (run these after every change)

| # | Command (from repo root) | What it proves | Needs backend? |
|---|---|---|---|
| A1 | `cd frontend_mobile && npx tsc --noEmit` | Mobile type-checks | No |
| A2 | `cd frontend_mobile && npx expo lint` | Lint. **Known pre-existing:** 4 `react/no-unescaped-entities` errors at `EvidenceScreen.tsx:413` + warnings | No |
| A3 | `cd frontend_mobile && npx expo export --platform android --output-dir %TEMP%\kx` | Metro bundles the whole app (catches missing modules, e.g. after deleting files) | No |
| A4 | `cd frontend_mobile && npx expo-doctor` | Config/dependency sanity. **Known pre-existing:** Expo patch-version mismatches | No |
| A5 | `cd backend && npm run test:mobile` | **Mobile upload suite** (`backend/tests/mobile_upload.test.js`, 12 tests): hashing, idempotent retry, concurrent-upload race, cross-case id clash, extension/MIME, status codes, case dedupe, sync push, list shape | Yes |
| A6 | `cd backend && npm test` | Legacy end-to-end suite (`test_e2e.js`): health, auth, case, upload, forensics, Section 63, sync, Fabric transfer | Yes (+ Fabric for some steps) |

Expected: A1/A3 clean; A5 all 12 pass. A5 fails every test with "Backend not reachable" if the backend is down — start it first.

---

## 2. Mobile manual tests

Use two devices/emulators or the web portal (`frontend_web`) as the "other side" where noted.

### 2.1 Authentication
| # | Steps | Expected |
|---|---|---|
| M1 | Valid email + password → biometric → OTP `1234` | Lands on Dashboard |
| M2 | Wrong password | "Access Denied / Invalid credentials", stays on login |
| M3 | Wrong OTP | "Invalid OTP" |
| M4 | Device with no biometrics | Info alert, proceeds to OTP |
| M5 | Log in, kill app, relaunch (online) | Session restored straight to Dashboard |
| M6 | Log in, airplane mode, kill app, relaunch | Session restored from cached JWT + local profile |
| M7 | Sign out, relaunch | Login screen (no auto-restore) |
| M8 | Server unreachable on login, no prior session | "No Connection" alert |
| M9 | Seeded `ADMIN` / `FORENSICS` / `POLICE` logins | Dashboard tiles/buttons match role (Create Case only for police/investigator/admin) |

### 2.2 Cases
| # | Steps | Expected |
|---|---|---|
| M10 | Create case (online) | Appears at top; present in web portal / `GET /cases` |
| M11 | Create case with empty title or location | "Please fill in all fields" |
| M12 | Create case in airplane mode | Saved locally, "queued" message; after reconnect it appears on the server **once** |
| M13 | Create case, then create again quickly / retry after timeout | No duplicate; a 409 from server is treated as success |
| M14 | Created case shows officer name, location, timestamp, `pending` hash | Not "Unassigned"/"Recent" after a live sync |

### 2.3 Evidence upload (core)
| # | Steps | Expected |
|---|---|---|
| M15 | Camera capture → name it → upload (online) | "Uploaded and registered"; item shows in case with image; server row has correct `file_hash` |
| M16 | Gallery pick of a **PNG** with a name without extension | Server `file_name` ends `.png`, `mime_type` `image/png` |
| M17 | Cancel at the naming prompt | Nothing uploaded |
| M18 | Deny camera permission | "Camera access is required", no crash |
| M19 | Upload in airplane mode | "Saved locally, queued"; item visible immediately |
| M20 | Reconnect after M19 (or bring app to foreground) | Item uploads automatically; case syncs first, evidence second; **exactly one** server record |
| M21 | Several offline uploads, then reconnect | All sync, in order, no duplicates |
| M22 | Kill app while an upload is queued, relaunch online | Queued upload still completes |
| M23 | Throttle/blackhole the network mid-upload (e.g. wifi with no internet) | Gives up after ~90 s (no infinite spinner), item queued, later syncs |
| M24 | Flip network on/off rapidly during upload | No duplicate records, stored file not lost (verify the file opens from the web portal) |
| M25 | Force a server rejection (stop Postgres, or log in as a user deleted from DB) | User sees the real error; item is **not** claimed as success |
| M26 | Many flaky reconnects (toggle airplane mode 6+ times) with one item queued | Item is **not** marked FAILED (network errors don't burn retries) |
| M27 | Upload to a case whose server row was deleted | Rejected with clear error; retry counter increments, stops at 5 |
| M28 | Tap "upload" twice quickly | One record |
| M29 | Check integrity badge on web dashboard after upload | `UNVERIFIED`, **not** `COMPROMISED` |
| M30 | Download the uploaded file from the web portal and `sha256sum` it | Equals the hash shown in the app |

### 2.4 Offline persistence & sync
| # | Steps | Expected |
|---|---|---|
| M31 | Log in online, open a case with evidence, airplane mode, force-quit, relaunch | Cases **and their evidence entries** still listed (metadata); on-device captures show images |
| M32 | Create case offline, reconnect, trigger refresh while it is still pending | Pending case stays visible (not wiped by the pull) |
| M33 | Delete a synced case in the web portal, relaunch mobile online | It disappears locally; an unsynced local case is untouched |
| M34 | Server returns an empty list (new empty DB) | Local cache is not wiped |
| M35 | Install new build **over** an old one (existing SQLite DB) | App boots; no data loss; `thumbnail_uri` migration runs |
| M36 | Reopen app after dev Fast Refresh / backgrounding for hours | No "NativeDatabase" errors surfaced as "offline" |
| M37 | Evidence of type video/PDF from web portal | Thumbnail shows (online); icon placeholder when no thumbnail |
| M38 | A queued sync item fails once (stop backend during flush) then start backend | Item retries on next trigger (up to 5), not stuck forever |

### 2.5 Reports, permissions, UI
| # | Steps | Expected |
|---|---|---|
| M39 | Generate PDF report for a case with evidence | PDF created and shareable; hashes listed |
| M40 | First launch fresh install | Camera/photos prompts use the Kaaval permission text (dev/EAS build) |
| M41 | Rotate / small screen / dark mode | Screens usable, no clipped buttons |
| M42 | Cold start with no network and no cache | App opens to login, no crash |
| M43 | Background → foreground | Sync listener fires (check backend log for `/api/sync/push`) |

---

## 3. Backend / API tests (curl or Postman)

| # | Request | Expected |
|---|---|---|
| B1 | `POST /api/auth/login {email,password}` | `{user, token}`; 401 `{message}` on bad creds |
| B2 | `GET /cases` | Array; each case has `evidence[]` with `uri`, `hash`, `file_hash`, `timestamp` |
| B3 | `POST /cases` twice with same `caseId` | 201 then 409 |
| B4 | `POST /cases` with unknown `userId` | 401 "Unrecognized user session" |
| B5 | `POST /cases/:id/evidence` (multipart) | 201; repeat with same `evidenceId` → 200 + `duplicate:true` |
| B6 | Same, `type=image/jpeg` | 400 (must be IMAGE/VIDEO/…) |
| B7 | Same, unknown case / no file | 404 / 400 |
| B8 | Same `evidenceId`, different case | 409 |
| B9 | `POST /api/sync/push` CASE CREATE twice | Both `ok`; one row; `created_by_user_id` set |
| B10 | `POST /cases/:id/evidence/:eid/verify` | `matched`, `integrityStatus` |
| B11 | `GET /evidence/:id`, `/evidence/history/:id`, `/case/:id` | Ledger data, or DB fallback when Fabric is down |
| B12 | `POST /transfer/request` then `/transfer/accept` | Status flows `IN_TRANSFER` → `IN_CUSTODY`; outbox rows enqueued |
| B13 | Check `blockchain_outbox` after upload | One `CREATE_EVIDENCE` row (not two) for a retried upload |
| B14 | Concurrency: fire 5 identical uploads in parallel | 1 DB row, object in MinIO intact |

---

## 4. Other tests worth running

**Data integrity & chain of custody**
- Tamper test: change a byte in the MinIO object, run verify → expect `COMPROMISED`.
- Hash agreement across layers: device-computed hash == server `file_hash` == `sha256sum` of the downloaded file.
- Audit trail: every upload/transfer/verify produces an `audit_logs` row with `source = MOBILE`.

**Security** (known gaps: mobile endpoints are currently unauthenticated and the OTP is a demo)
- Call `/cases`, `/api/sync/push` with no token → currently succeeds (documented gap; should become 401 once auth is enforced).
- Forge a `userId` in the upload form → server uses that user's role/org; verify behaviour is acceptable.
- Oversize upload (>100 MB) → clean error. Wrong MIME/extension mismatch.
- SQLi probes in case title / names (parameterised queries — expect stored as text).

**Resilience**
- Kill Postgres mid-upload: object cleaned from MinIO, client gets an error, retry succeeds later.
- Kill MinIO: upload fails with an error (not a silent success).
- Expired JWT offline: restore path clears token and shows login.

**Performance**
- Upload a 20–50 MB file: hashing on-device doesn't freeze the UI or OOM (hash reads the whole file as base64 — watch memory on low-end phones).
- 200 cases × 20 evidence items: Dashboard and boot load time (boot now loads all evidence in one query).

**Cross-system**
- Web portal: evidence uploaded from mobile appears, hash/integrity match, Section 63 flow works.
- Fabric: outbox worker anchors `CREATE_EVIDENCE`; `/health/fabric` ok; `on_chain_status` moves off `BLOCKCHAIN_PENDING`.

---

## 5. Known gaps (don't report as new bugs)
- Mobile/sync endpoints have **no auth** (deliberately deferred).
- OTP `1234` is a mock.
- Pulled evidence **images** don't render offline (presigned URLs expire); on-device captures do.
- No mobile unit-test runner (jest) is set up; mobile logic is covered by A1–A3 + manual tests + the backend suite. Adding jest-expo would let the mapper/sync functions be unit-tested.
- `expo lint` errors at `EvidenceScreen.tsx:413`; Expo patch-version mismatches.

## 6. Test log template
```
Date: ____  Build/commit: ____  Device/OS: ____  Backend: local/staging
A1 ☐  A3 ☐  A5 ☐ (12/12)  A6 ☐
Manual IDs failed: ____   Notes: ____
```

## Expo SDK 58 upgrade checks

The mobile app targets **Expo SDK 58** (RN 0.88, React 19.3) so it opens in Expo Go SDK 58. Use Node 22.13+/24 LTS (Node 25 triggers engine warnings).

- [ ] `cd frontend_mobile && npx expo-doctor` -> 20/20 checks pass
- [ ] `npx expo export --platform android` bundles without errors
- [ ] `npx expo start -c`, scan QR in Expo Go SDK 58 -> app opens, no "incompatible SDK" error
- [ ] Smoke: login, capture evidence (camera/picker), offline SQLite save + sync, presigned MinIO upload, PDF export/share, biometric prompt
- [ ] Phone can reach the backend/MinIO LAN IP set in `frontend_mobile/.env`

### Field encryption (`frontend_mobile/src/db/encryption.ts`)

AES-256-GCM via `expo-crypto`; stored values look like `enc2:<base64>`. Legacy plaintext rows are still read correctly.

- [ ] Capture new evidence, then inspect the SQLite file (or log a raw row): `file_hash`, `metadata_hash`, `collected_location`, `name` start with `enc2:`
- [ ] The evidence list/detail screens still show the decrypted values
- [ ] Rows saved before this change (plaintext) still display unchanged
- [ ] Restart the app: values still decrypt (key persisted in SecureStore)
- [ ] Release build: if encryption fails the save errors out (no plaintext fallback outside `__DEV__`)
