# Kaaval — Project Status, Gaps & Implementation Plan

> **Last reviewed:** 2026-09-03
> **Scope:** Whole-repo status snapshot, with a detailed deep-dive on the case-management / assignment flow in `frontend_web`, which is the most significant functional gap found.

This document is a working audit, not aspirational documentation — every claim below is backed by a specific file and line reference. Update it as gaps are closed.

> **Update (2026-09-03, same day):** Phases 1, 2, 3 and 5 below have been implemented and verified live (API calls + browser UI walkthrough); Phase 4 has been partially implemented (config fix only, network standup deliberately deferred). See [§7 Resolution Log](#7-resolution-log) for exactly what changed and what remains.

---

## 1. Overall Component Status

| Component | Status | Notes |
|---|---|---|
| [`backend/`](../backend) | **Working (DB/storage only)** | Express (ESM), Postgres, MinIO all live and healthy. Fabric/blockchain layer is **not currently connected** — see §3. Real route separation for `/api/mobile`, `/api/web`, `/api/legal`. |
| [`frontend_web/`](../frontend_web) | **Working, gapped** | React 19/Vite portal. Auth, dashboards, evidence vault, certificates, chain-of-custody all functional. Case *lifecycle management* (assignment/reassignment) is the weak point — see §2. |
| [`frontend_mobile/`](../frontend_mobile) | **Working (unaudited in depth)** | Expo/React Native offline-first field app, SQLite + `expo-crypto` at-capture hashing. Matches architecture docs. |
| [`frontend_legal/`](../frontend_legal) | **Now integrated** (as of commit `e69b85b`) | Previously a fully mocked, disconnected third portal (`DEMO_ACCOUNTS`, no HTTP calls). As of the latest pull it has a real `src/services/api.ts` hitting `http://localhost:4000` and `AuthContext.tsx` no longer references mock accounts. Still not mentioned in `start-all.bat` or root `README.md` — should be added to both. |
| [`chaincode/evidence/`](../chaincode/evidence) | **Working (unaudited in depth)** | Go chaincode, ~650 lines, full asset/custody lifecycle. Compiled binary present, suggesting local build/test occurred. |

### Cross-cutting issues
- **No `npm test` script** in `backend/package.json` — the real E2E suite (`backend/test_e2e.js`, 14+ steps) must be run via `node test_e2e.js` directly. Anyone following typical Node conventions (`npm test`) gets `Missing script: test`.
- **Fabric enabled by default locally, and currently broken** — `backend/.env` has `FABRIC_DISABLED=false`, so the backend actively tries to connect on every outbox poll and fails every time. This isn't just "network not running" — there's also a live config path bug. See §3 for full detail.
- **`frontend_legal` undocumented** — not referenced in `README.md`, `docs/README.md`, or `start-all.bat`, despite now being a real, wired-up client.

---

## 2. Case Management Flow — Current State (`frontend_web`)

### 2.1 Case creation

- **UI:** "Create New Case" modal — [`frontend_web/components/Dashboards.tsx:303-322`](../frontend_web/components/Dashboards.tsx), handler `handleCreateCase` (same file, line 310).
- **Fields collected:** `title`, `description` **only**.
- **Fields set automatically:** `status: OPEN`, `createdBy`, `createdAt`.
- **Fields NOT set at creation, despite existing in the schema:** `currentCustodian` / `current_custodian_id`, `assignedToForensics` / `assigned_forensics_id`.
- **Backend:** `POST /api/web/cases` (`backend/src/routes/web/caseRoutes.js`) — accepts and stores `assigned_forensics_id` in the `INSERT` (line ~83) *if the caller sends it*, but the frontend form never sends it.

**Conclusion:** an admin cannot assign a police officer or forensics team at the moment a case is created — the capability exists in the data model and partially in the backend insert, but the creation form doesn't expose it.

### 2.2 Post-creation actions available today

| Action | Who | Frontend entry point | Backend route | What it changes |
|---|---|---|---|---|
| Update case status | ADMIN | Status dropdown, [`CaseViews.tsx:372-392`](../frontend_web/components/CaseViews.tsx) → `updateCaseStatus` (`store.tsx:412-429`) | `PATCH /api/web/cases/:caseId/status` | `status` only |
| Approve evidence | ADMIN/LEGAL | Evidence approval controls (`canApprove`, `CaseViews.tsx:185`) | `POST /api/web/evidence/:id/approve` (via `approveEvidence`) | Evidence-level `approved_for_legal`, not case-level |
| Transfer custody | **POLICE only, and only while holding custody** | "Sign & Transfer Custody" button, gated by `canTransferCustody = role === POLICE && hasCustody` (`CaseViews.tsx:188`, modal at 710-759) → `transferCaseCustody` (`store.tsx:501-526`) | `POST /api/web/cases/:caseId/transfer-custody` | `current_custodian_id` / `current_custodian_name`; logs to `case_custody_transfers`; queues `TRANSFER_INITIATE` blockchain outbox event |

That's the entire set. **There is no action, anywhere in the frontend or backend, that lets anyone — including ADMIN — change `assigned_forensics_id` after the case is created.** It is a write-once field, populated only if the (currently nonexistent) creation-time payload includes it, and displayed read-only forever after (`{currentCase.assignedToForensics || 'Unassigned'}`, `CaseViews.tsx:620`).

### 2.3 Why "transfer custody" doesn't solve this for admins

- It's gated to `role === POLICE && hasCustody` in the UI. Admin never sees the control, regardless of state.
- The backend route itself has **no role check** — any authenticated caller could theoretically hit it — but since the frontend never renders the trigger for ADMIN, it's unreachable through normal use.
- Even if admin could call it, it only ever mutates *custodian* (who currently holds the evidence), never *assigned forensics* (which lab/analyst is responsible for verification). These are two distinct concepts in the schema that have been conflated in practice because only one of them has a mutation path at all.

---

## 3. Blockchain / Fabric Integration — Current State

**Verified live on 2026-09-03** by querying the running backend and Docker directly (not inferred from code alone).

### 3.1 The blockchain is not reachable right now, for two independent reasons

**(a) No Fabric network is running.** `docker ps -a` shows no orderer, peer, or CA containers anywhere on the machine — only `kaaval-postgres` and `kaaval-minio` are up and healthy. The Hyperledger Fabric test-network (`fabric-samples/test-network`) has to be started manually with its own scripts, and it currently isn't.

**(b) Even if it were running, a config path bug would still block the connection.** The backend was running live (port 4000) during this audit. Hitting its dedicated health check:

```
GET /health/fabric
{"status":"degraded","fabric":{"connected":false,"disabled":false,
"error":"Connection profile not found at D:\\chain_of_custody\\backend\\src\\config\\src\\config\\connection-3org.json"}}
```

Note the doubled `src\config\src\config` segment. Root cause, in [`backend/src/config/index.js:40-47`](../backend/src/config/index.js):

```js
connectionProfilePath: path.resolve(__dirname, process.env.FABRIC_CCP_PATH || './connection-3org.json'),
walletPath: path.resolve(__dirname, process.env.FABRIC_WALLET_PATH || '../../wallet'),
```

`__dirname` here is `backend/src/config`. The code's own defaults are correct relative to that base. But [`backend/.env`](../backend/.env) overrides both with paths written as if they were relative to the **backend root**, not to `src/config`:

```
FABRIC_CCP_PATH=./src/config/connection-3org.json     # resolves to backend/src/config/src/config/... (wrong, doesn't exist)
FABRIC_WALLET_PATH=./wallet                             # resolves to backend/src/config/wallet (wrong, doesn't exist)
```

Confirmed both target paths are wrong and the correct files exist elsewhere:
- `backend/src/config/connection-3org.json` exists (correct location); `backend/src/config/src/config/connection-3org.json` does not.
- `backend/wallet/{admin.id, appUser.id}` exist (correct location); `backend/src/config/wallet/` does not.

This is not a repo-template problem — the root `.env.example` doesn't set `FABRIC_CCP_PATH`/`FABRIC_WALLET_PATH` at all, so these two lines were added directly to the local `backend/.env` with the wrong base-path assumption.

### 3.2 What still works despite this

- The **transactional outbox** ([`backend/src/services/outboxWorker.js`](../backend/src/services/outboxWorker.js)) degrades gracefully — cases, evidence, status changes, and custody transfers all persist correctly in Postgres regardless of Fabric's state.
- Queried `blockchain_outbox` directly: **0 rows** currently. No chain-relevant action has been queued yet in this environment (consistent with a recently reset/seeded database), so the connection failure hasn't even been exercised by real traffic yet — it would trigger on the next case/evidence/certificate/transfer action.
- The chaincode itself ([`chaincode/evidence/go/evidence.go`](../chaincode/evidence/go/evidence.go)) and wallet identities look complete and were presumably built/tested at some point (compiled `evidence.exe` present).

### 3.3 Practical implication

Every part of the product narrative that says "anchored on-chain" — Section 63 BSA certificates, forensic verification, custody transfers — is **currently DB-only**. Nothing has reached a ledger in this environment, and nothing can until both issues below are fixed.

---

## 4. Everything Missing (Gap List)

Ordered roughly by impact. **Status as of the §7 resolution pass (2026-09-03):**

1. ~~**No case-assignment UI at creation.**~~ **RESOLVED.** The create-case form now has role-appropriate pickers for POLICE (custodian) and FORENSICS (assigned analyst).
2. ~~**No reassignment endpoint for forensics.**~~ **RESOLVED.** `PATCH /api/web/cases/:caseId/assignment` added.
3. ~~**No reassignment UI for admin.**~~ **RESOLVED.** `CaseViews.tsx` has an admin-visible "Edit Assignment" action.
4. ~~**Custody transfer is not admin-reachable.**~~ **RESOLVED** (chose the "force with override reason" option). `canTransferCustody` now includes ADMIN, gated on a required `override_reason`.
5. ~~**No audit-log entries for assignment changes.**~~ **RESOLVED.** `REASSIGN_CASE` audit action added and verified writing to `audit_logs`.
6. ~~**No backend role enforcement on `transfer-custody`.**~~ **RESOLVED.** The route now rejects with 403 unless the caller holds custody (POLICE) or is ADMIN with an override reason.
7. ~~**Fabric connection profile / wallet paths are misconfigured.**~~ **RESOLVED.** Fixed and verified live (see §7) — no more "file not found," only "no reachable peer" (expected, since no network is running).
8. **No Fabric test-network is running.** **STILL OPEN** — explicitly descoped for this pass; see §7.
9. ~~**`npm test` missing.**~~ **RESOLVED.**
10. ~~**`frontend_legal` not documented in root docs / `start-all.bat`.**~~ **RESOLVED** in `README.md` and `start-all.bat`; still missing from `docs/README.md`'s index (see §7).

---

## 5. What to Implement

### Phase 1 — Assignment at creation (smallest, highest-value fix)
- Extend the "Create New Case" modal (`Dashboards.tsx`) with two optional selects: **Assign Officer** (POLICE users) and **Assign Forensics** (FORENSICS users), populated from the existing user list already loaded into `store.tsx`.
- Extend `handleCreateCase` / the `createCase` store action to pass `current_custodian_id` and `assigned_forensics_id` through to `POST /api/web/cases`.
- No backend change needed here — `caseRoutes.js` already accepts `assigned_forensics_id` on insert; just also accept/store `current_custodian_id` explicitly if it doesn't already (verify against current INSERT column list).

### Phase 2 — Reassignment after creation
- **Backend:** add `PATCH /api/web/cases/:caseId/assignment` accepting `{ assigned_forensics_id?, current_custodian_id? }`. Validate the target user exists and has the matching role (reject assigning a POLICE case to a FORENSICS custodian id, etc.). Write an `audit_logs` row (`action: 'REASSIGN_CASE'`) inside the same transaction.
- **Frontend:** add a `reassignCase(caseId, updates)` action in `store.tsx` mirroring the shape of `updateCaseStatus`. Add an "Edit Assignment" control to `CaseViews.tsx`, visible to ADMIN, opening a small form (reuse the picker components from Phase 1).
- Re-run `loadData()` after the mutation, consistent with the de-mocking pattern already established in the recent `frontend_web` refactor (mutations re-sync from server rather than trusting optimistic local state).

### Phase 3 — Admin-reachable custody transfer
- Decide the product rule: should admin be able to force a custody transfer without the current custodian's sign-off, or should admin only be able to *initiate* a transfer that the target still has to accept?
- If forcing: extend `canTransferCustody` to `role === POLICE && hasCustody || role === ADMIN`, and add a required `override_reason` field captured in the transfer modal and stored alongside the `case_custody_transfers` row when the actor is ADMIN.
- Add server-side role/state validation to `POST /api/web/cases/:caseId/transfer-custody` (currently trusts the client) so this isn't only enforced in the UI.

### Phase 4 — Restore Fabric connectivity
- Fix `backend/.env`: change `FABRIC_CCP_PATH` to `./connection-3org.json` and `FABRIC_WALLET_PATH` to `../../wallet` (matching the code's own correct defaults in `src/config/index.js`), or simply delete both lines so the defaults apply.
- Bring up the Fabric test-network (`fabric-samples/test-network`) with the 3-org consortium (Police/FSL/Court) and deploy the `evidence` chaincode.
- Restart the backend and confirm `GET /health/fabric` reports `"connected": true`.
- Trigger one real chain-relevant action (e.g., a custody transfer) and confirm a row lands in `blockchain_outbox` and is subsequently marked processed, not stuck retrying.

### Phase 5 — Cross-cutting cleanup
- Add `"test": "node test_e2e.js"` to `backend/package.json` scripts.
- Add `frontend_legal` startup step to `start-all.bat` and a section in root `README.md` / `docs/README.md`'s documentation index and architecture diagram.
- Consider whether `FABRIC_DISABLED` should default to `true` in `.env.example` so a fresh clone doesn't spam Fabric connection errors before the test-network is deliberately brought up.

---

## 6. Suggested Acceptance Criteria (for Phases 1–2)

- [x] Admin can select a POLICE officer and FORENSICS analyst while creating a case; both are persisted and visible in the case detail view immediately.
- [x] Admin can open an existing case and change its assigned forensics analyst and/or custodian without going through the police-only transfer flow.
- [x] Every assignment/reassignment produces a row in `audit_logs` visible in the case's audit trail.
- [x] Reassigning to a user whose role doesn't match the target field (e.g., assigning a LEGAL user as "assigned forensics") is rejected server-side with a clear error.
- [x] `frontend_web` re-fetches and displays the updated assignment without requiring a manual page refresh (via post-mutation `loadData()`, independent of the separate in-flight polling-removal refactor — see §7).

### For Phase 4 (Fabric)
- [x] `backend/.env` no longer has the doubled-path bug — confirmed live: `GET /health/fabric` error changed from `"Connection profile not found at ...\\src\\config\\src\\config\\connection-3org.json"` to `"Committer must be connectable"`, i.e. the profile/wallet now load correctly and the only remaining failure is "no live network to connect to."
- [ ] `GET /health/fabric` reports `"connected": true`. **Still open** — no Fabric test-network is running in this environment (deliberately out of scope for this pass; see §7).
- [ ] A custody transfer, forensic verification, or certificate issuance produces a `blockchain_outbox` row that transitions to a processed/confirmed state. **Still open**, blocked on the same missing network.

---

## 7. Resolution Log

**2026-09-03 — Phases 1, 2, 3, 5 implemented; Phase 4 config bug fixed (network standup deferred).**

| Phase | What shipped | Files |
|---|---|---|
| 1 — Assignment at creation | "Create New Case" modal now has "Assign Officer (Custodian)" and "Assign Forensics Analyst" selects, populated from `users` filtered by role. `handleCreateCase` passes `currentCustodian`/`assignedToForensics` through to the existing (unchanged) `POST /api/cases`. | [`Dashboards.tsx`](../frontend_web/components/Dashboards.tsx) |
| 2 — Reassignment after creation | New `PATCH /api/cases/:caseId/assignment` — validates `assigned_forensics_id` is a FORENSICS user and `current_custodian_id` is a POLICE user (400 otherwise), updates the case, writes a `REASSIGN_CASE` audit row. New `reassignCase()` store action. New admin-only "Edit Assignment" modal in the case detail header. | [`caseRoutes.js`](../backend/src/routes/web/caseRoutes.js), [`store.tsx`](../frontend_web/store.tsx), [`CaseViews.tsx`](../frontend_web/components/CaseViews.tsx) |
| 3 — Admin-reachable custody transfer | Decision made: **ADMIN can force a transfer** (not initiate-only/accept flow). `canTransferCustody` now also allows `ADMIN`; the transfer modal requires a non-empty "Override Reason" when the actor is ADMIN. **Server-side enforcement added** to `POST /:caseId/transfer-custody` (previously trusted the client entirely, per gap #6): rejects with 403 unless the caller is the POLICE user who currently holds custody, or ADMIN with a non-empty `overrideReason`. The reason is persisted in a new `case_custody_transfers.override_reason` column and included in the audit log detail. | [`caseRoutes.js`](../backend/src/routes/web/caseRoutes.js), [`legal_extension.sql`](../backend/src/db/legal_extension.sql) (idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, applied), [`store.tsx`](../frontend_web/store.tsx), [`CaseViews.tsx`](../frontend_web/components/CaseViews.tsx) |
| 4 — Fabric connectivity (config only, per explicit scoping decision) | Fixed `FABRIC_CCP_PATH`/`FABRIC_WALLET_PATH` in `backend/.env` to be relative to `backend/src/config` as the code expects. **Verified live** by restarting the backend: the `/health/fabric` error changed from a file-not-found path bug to a genuine "no reachable peer" error (`Committer must be connectable`), confirming the profile and wallet now resolve correctly. Standing up the actual Fabric test-network and deploying the chaincode was explicitly descoped for this pass and remains open. | [`backend/.env`](../backend/.env) |
| 5 — Cross-cutting cleanup | Added `"test": "node test_e2e.js"` to `backend/package.json`. Added `frontend_legal` (port 5174) as a startup step in `start-all.bat` and the Quick Start section of root `README.md`. | [`backend/package.json`](../backend/package.json), [`start-all.bat`](../start-all.bat), [`README.md`](../README.md) |

**Verification method:** backend endpoints were exercised directly against the live dev database (valid reassignment, invalid-role rejection, unauthorized-transfer rejection, admin-override transfer all returned the expected responses and audit rows), then re-verified through a full browser walkthrough of the new UI (create case with assignments → edit assignment → force-transfer with override reason), logged in as an actual ADMIN seed user.

**Still open / explicitly out of scope for this pass:**
- Standing up the Hyperledger Fabric test-network itself and deploying the `evidence` chaincode (Phase 4, second half).
- The `frontend_web/store.tsx` polling-removal refactor already in progress before this work (removed the 5-second `setInterval(loadData, 5000)` in favor of an exposed `refreshData()`) was left as-is — mutations already re-sync via `loadData()` on success, so it doesn't block any of the above, but nothing currently calls `refreshData()` for out-of-band updates (e.g. changes made by another user/tab).
- `frontend_legal` still isn't mentioned in `docs/README.md`'s documentation index (only root `README.md` and `start-all.bat` were updated).
