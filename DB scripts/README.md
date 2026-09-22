# DB scripts

Database setup and development data for NodeWatch / Kaaval.

These two scripts are the **only** supported way to build a working database.
Nothing in the application should ever hardcode case, evidence, user or audit
data again — if you need sample data, add it to `02_seed_mock_data.cjs`.

## Usage

Run from the repository root:

```bash
# 1. Create the database and every table (safe to re-run)
node "DB scripts/01_create_database.cjs"

# 2. Load the development dataset (safe to re-run)
node "DB scripts/02_seed_mock_data.cjs"
```

### Flags

| Command | Effect |
|---|---|
| `01_create_database.cjs` | Creates `kaaval_db` if absent, then applies the base schema and all extensions. Idempotent. |
| `01_create_database.cjs --reset` | **Destroys all data**, then rebuilds the schema from scratch. |
| `02_seed_mock_data.cjs` | Upserts the development dataset. Idempotent — re-running refreshes rows rather than duplicating them. |
| `02_seed_mock_data.cjs --purge` | Deletes the rows this seed owns before re-inserting. Leaves the pre-existing court/legal dataset untouched. |

Connection details come from `backend/.env` (`DATABASE_URL`). Dependencies are
resolved from `backend/node_modules`, so this folder needs no install step.

## What gets created

`01_create_database.cjs` applies, in order:

| File (in `backend/src/db/`) | Contents |
|---|---|
| `schema.sql` | Enums, `users`, `cases`, `evidence`, `evidence_visibility`, `custody_transfers`, `case_custody_transfers`, `section63_certificates`, `case_documents`, `audit_logs`, `blockchain_outbox` |
| `legal_extension.sql` | Court metadata on `cases`, plus `case_parties` and `case_hearings` |
| `priority_extension.sql` | `cases.is_priority` |
| `investigation_extension.sql` | Investigating-officer domain: `forensic_records`, `custody_events`, `alerts`, plus IO columns on `cases`, `evidence` and `audit_logs` |

The SQL deliberately lives in `backend/src/db/` rather than being duplicated
here, because the backend applies the same files on startup (see
`backend/src/db/migrate.cjs`). One source of truth, so the two can never drift.

## What gets seeded

| Table | Rows | Notes |
|---|---|---|
| `users` | 19 officers | Police and FSL staff. Password for all: `password123` |
| `cases` | 8 | FIR 033, 056, 067, 089, 142, 178, 201, 215 of 2026 |
| `evidence` | 17 | Includes `EV-0215`, the deliberately COMPROMISED exhibit |
| `forensic_records` | 15 | FSL examination lifecycle per exhibit |
| `custody_events` | 20 | Chain-of-custody timeline |
| `alerts` | 7 | Integrity, custody and forensic exceptions |
| `audit_logs` | 19 | Investigation audit trail |

### Identifiers

Cases have two identifiers and both matter:

- `case_id` — the real primary key, e.g. `CASE-2026-142`. Use it for lookups,
  joins and navigation.
- `fir_number` — the human reference, e.g. `142/2026`. Display only. It is
  stored **without** the `FIR ` prefix; the UI adds that when rendering.

API endpoints under `/api/investigation/*` accept either form.

### Derived values are not stored

Per-case evidence counts and forensic progress are computed at query time from
the `evidence` and `forensic_records` tables. Do not add columns that cache
them — the point is that a dashboard figure can never disagree with the rows it
summarises.
