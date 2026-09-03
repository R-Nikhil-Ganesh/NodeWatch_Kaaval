# Court Management System

A standalone web app for the **Legal / Court side** of the NodeWatch (Kaaval) system — Judges, Public Prosecutors, Defense Counsel and Registrars. Split out from the `LEGAL` role that previously lived inside `frontend_web`, and rebuilt around the flow defined in the project's `Flow definition.pdf` / `Flow of new app.pdf`.

This is a **UI-only v1**: every case, hearing, file, evidence item and audit log entry is mock data in [`src/data/mockData.ts`](src/data/mockData.ts). No backend or Hyperledger Fabric calls are wired up yet — that comes in a later pass, reusing the same domain types in [`src/types.ts`](src/types.ts).

## Stack

React 19 + TypeScript + Vite + Tailwind (CDN) + `react-router-dom` + `lucide-react`. No UI kit — a small primitives library lives in [`src/components/ui/Primitives.tsx`](src/components/ui/Primitives.tsx). Styled with the navy/saffron/white theme (`index.html`'s Tailwind config), matching `theme for legal web app.css` at the repo root.

## Run it

```bash
npm install
npm run dev      # http://localhost:5174
```

Demo accounts (password `password123` for all — see the login screen for the full list):

| Email | Designation |
|---|---|
| vijay.sundaram@tngovt.in | Public Prosecutor |
| kalaiselvi.r@tnjudiciary.gov.in | District Judge |
| aishwarya.menon@tnbar.org | Defense Counsel |
| ganesh.p@tnjudiciary.gov.in | Registrar |

MFA step accepts any 6 digits. Forgot-password OTP accepts any 6 digits too.

## Pages

- `/` — Onboarding / landing page
- `/login`, `/forgot-password` — auth (credentials → MFA; email → OTP → new password → success)
- `/home` — Ongoing Cases / Case History, searchable & filterable by case type
- `/case/:caseId/home` — case details, BNS/BNSS sections, parties, stage stepper, hearing timeline + hearing-history dropdown (date, purpose, judge's statement, attendance)
- `/case/:caseId/files` — FIR, Panchnama/consent forms, Section 63 BSA certificates, warrants, chargesheet, court orders — each with its chain-of-custody trail
- `/case/:caseId/evidence` — physical evidence (Malkhana location, collecting officer) and digital evidence (SHA-256 hash, Hyperledger tx ref, integrity status, a mock "Verify Integrity Against Ledger" check)
- `/case/:caseId/audit-logs` — access log scoped to the open case
- `/profile` — signed-in user's judicial/bar identity

## Notes for backend integration later

- `src/types.ts` mirrors real Indian criminal-process concepts (FIR fields, Section 193 BNSS chargesheet, Section 63 BSA certificate, BNS/NDPS/POCSO section citations, eCourts-style hearing purposes) — replace the mock arrays in `mockData.ts` with API calls against this same shape.
- `src/context/AuthContext.tsx` is a placeholder session (email lookup, no real password/OTP check) — swap for the real auth/MFA API used by `frontend_web`'s `backend_web`.
