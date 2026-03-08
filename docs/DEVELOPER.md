# Developer Guide — RACATOM-LMIS

## Architecture Overview

The application follows a standard **React SPA + Express REST API** architecture:

```
Browser
  └── React 18 SPA (Vite)
        ├── Ant Design 5 UI
        ├── Axios HTTP client
        └── CryptoJS encrypted storage
              │
              ▼
Express 5 API Server
  ├── JWT Authentication (access + refresh tokens)
  ├── Mongoose ODM
  ├── bcrypt password hashing
  ├── Role-based permission middleware
  └── Google Drive file storage
              │
              ▼
MongoDB Atlas
  ├── user_accounts
  ├── loan_clients
  ├── loan_clients_cycles (LoanCycle)
  ├── loan_clients_collections (LoanCollection)
  ├── loan_clients_application (LoanClientApplication)
  ├── loan_disbursed
  ├── loan_documents
  ├── loan_collectors
  ├── loan_rates
  └── announcements
```

---

## Authentication Flow

### Token Architecture

| Token | Type | Lifetime | Storage |
|---|---|---|---|
| Access Token | JWT | 15 minutes | Encrypted sessionStorage (per tab) |
| Refresh Token | JWT | 7 days | HttpOnly cookie (`rt`) |

### Login Flow

1. User submits credentials → `POST /api/auth/login`
2. Server validates with bcrypt → issues access token + refresh token cookie
3. Client stores token in encrypted sessionStorage via `lsSetSession("token", token)`
4. Axios request interceptor reads token and adds `Authorization: Bearer <token>` header
5. On 401, axios response interceptor attempts silent refresh via `GET /api/auth/refresh` (sends `rt` cookie)
6. If refresh succeeds, new access token stored; original request retried
7. If refresh fails, user redirected to `/login`

### Password Policy

Enforced on both client and server:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character

### Idle Timeout

- 10-minute inactivity auto-logout (mouse, keyboard, touch, scroll activity tracked)
- 1-minute warning modal before auto-logout
- Implemented via `useIdleTimeout` hook in `Home.jsx`

---

## Authorization & Permissions

### User Schema Permissions

```json
{
  "permissions": {
    "menus": {
      "dashboard": true,
      "loans": true,
      "reports": true,
      "settings": true,
      "settingsEmployees": true,
      "settingsCollectors": true,
      "settingsDatabase": false,
      "settingsAnnouncements": true,
      "settingsAccounting": true,
      "developerSettings": false
    },
    "actions": {
      "loans": { "canView": true, "canEdit": true, "canDelete": false, "canCreate": true },
      "collections": { "canView": true, "canEdit": true, "canDelete": false, "canCreate": true },
      "disbursements": { "canView": true, "canEdit": false, "canDelete": false },
      "applications": { "canView": true, "canEdit": true }
    }
  }
}
```

### Authorization Layers

| Layer | Implementation | Scope |
|---|---|---|
| **Route Auth** | `requireAuth` middleware | All API routes except auth endpoints |
| **Menu Visibility** | `permissions.menus` checked in `Home.jsx` sidebar | UI-only |
| **Action Permissions** | `checkActionPermission(module, action)` middleware | Server-enforced on create/update/delete |
| **Self-Edit Guard** | `canUpdateUser` middleware with field whitelist | User profile edits |
| **Developer Gate** | `developerOnly` middleware | Database, Developer Settings |

### Role Hierarchy

| Role | Capabilities |
|---|---|
| **Developer** | Full access to everything, can edit all users |
| **Administrator** | Full access to business features, bypasses action permission checks |
| **Manager** | Access based on assigned permissions |
| **Staff** | Access based on assigned permissions |
| **User** | Minimal access based on assigned permissions |

### Self-Registration Security

- Users **cannot** self-register as Administrator or Developer
- `Position` is only assignable by Developers via admin tools
- Self-edit is limited to: `FullName`, `Email`, `Photo`, `ContactNumber`, `Address`

---

## API Reference

### Auth Endpoints (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Create account (restricted designations) |
| GET | `/verify-token/:token` | No | Verify email |
| POST | `/login` | No | Login with credentials |
| POST | `/logout` | No | Clear session cookies |
| GET | `/refresh` | Cookie | Refresh access token |
| POST | `/resend-verification` | No | Resend verification email |
| POST | `/forgot-password` | No | Request password reset email |
| POST | `/reset-password/:token` | No | Reset password with token |
| PUT | `/change-password` | JWT | Change password (authenticated) |
| GET | `/me` | JWT | Get current user info |
| GET | `/maintenance-status` | JWT | Check maintenance mode |

### Loan Endpoints (`/api/loans`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/` | JWT | — | List loans (paginated, filtered) |
| GET | `/:id` | JWT | — | Get loan by ID |
| POST | `/cycles` | JWT | `loans.canCreate` | Create loan cycle |
| PUT | `/:id` | JWT | `loans.canEdit` | Update loan |
| PUT | `/cycle/:id` | JWT | `loans.canEdit` | Update loan cycle |
| DELETE | `/:id` | JWT | `loans.canDelete` | Delete loan |
| POST | `/apply-automated-statuses` | JWT | — | Auto-compute statuses |
| GET | `/export` | JWT | — | Export loans to Excel |

### Collection Endpoints (`/api/collections`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/` | JWT | — | List collections (paginated, filtered) |
| GET | `/:loanCycleNo` | JWT | — | Get collections by loan cycle |
| POST | `/` | JWT | `collections.canCreate` | Add collection |
| PUT | `/:id` | JWT | `collections.canEdit` | Update collection |
| DELETE | `/:id` | JWT | `collections.canDelete` | Delete collection |
| PATCH | `/bulk-update` | JWT | — | Bulk update collector names |

### Disbursement Endpoints (`/api/disburse`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/` | JWT | — | List disbursed records |
| PUT | `/:id` | JWT | `disbursements.canEdit` | Update record |
| DELETE | `/:id` | JWT | `disbursements.canDelete` | Delete record |

### Application Endpoints (`/api/applications`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/pending` | JWT | — | List pending applications |
| PATCH | `/:id/approve` | JWT | `applications.canEdit` | Approve application |
| PATCH | `/:id/reject` | JWT | `applications.canEdit` | Reject application |
| PATCH | `/:id/reapply` | JWT | `applications.canEdit` | Reapply application |

### User Endpoints (`/api/users`)

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| GET | `/` | JWT | — | List all users |
| PUT | `/:id` | JWT | `canUpdateUser` | Update user (field-whitelisted for self-edit) |
| DELETE | `/:id` | JWT | `canDeleteUser` | Delete user (Developer only) |

---

## Data Models

### LoanCycle

Core loan record. Fields: `AccountId`, `ClientNo`, `LoanCycleNo`, `LoanAmount`, `PrincipalAmount`, `LoanBalance`, `LoanInterest`, `LoanAmortization`, `Penalty`, `LoanStatus`, `CollectorName`, `StartPaymentDate`, `MaturityDate`, `PaymentMode`, `RunningBalance`.

### LoanCollection

Payment transactions. All financial fields use `Decimal128` for precision: `Amortization`, `PrincipalDue`, `PrincipalPaid`, `PrincipalBalance`, `CollectedInterest`, `InterestPaid`, `TotalCollected`, `ActualCollection`, `CollectionPayment`, `RunningBalance`, `TotalLoanToPay`.

### LoanClient

Client demographics: name, address, contact info, `MonthlyIncome`, civil status.

### LoanClientApplication

Pending loan applications with full rate breakdown: `Processing Fee`, `Interest Rate/Month`, `Penalty Rate`, `Notarial Rate`, etc.

---

## Security Model

### Financial Data Validation

- `validateFinancialFields` middleware auto-validates all known financial fields in request body
- Checks: finite number, non-negative (except balances), max 999,999,999
- Applied to all POST/PUT routes for loans, collections, disbursements

### Input Sanitization

- **Regex injection (ReDoS):** All user-supplied search strings are escaped via `escapeRegex()` before use in `$regex` queries
- **MongoDB operator injection:** `sanitizeMongoFilter()` strips dangerous operators like `$where`, `$expr` from filter objects
- **Bulk update whitelisting:** `bulkUpdateCollector` only allows `CollectorName`, `PaymentMode`, `CollectorCode` fields

### Anti-Enumeration

- Forgot-password always returns generic success message regardless of email existence
- Resend-verification returns generic message for both found/not-found users
- Registration uses generic "credentials already exist" message

### Storage Security

- All localStorage/sessionStorage keys are HMAC-SHA256 hashed with prefix `__rct__`
- All values are AES encrypted via CryptoJS
- Token stored in sessionStorage (tab-scoped) to prevent cross-tab bleed
- `VITE_ENCRYPT_SECRET` env variable should be set for production (fallback is `LMIS_DEV_ENC_KEY`)

---

## Development Workflow

### Key Files

| File | Purpose |
|---|---|
| `front-end/src/App.jsx` | Route definitions |
| `front-end/src/pages/Home/Home.jsx` | Main layout, sidebar, idle timeout |
| `front-end/src/utils/axios.js` | API client, interceptors, token refresh |
| `front-end/src/utils/storage.js` | Encrypted storage utilities |
| `front-end/src/utils/useIdleTimeout.js` | Idle timeout hook |
| `server/server.js` | Server entry, middleware, routes, cron |
| `server/middleware/requireAuth.js` | JWT verification middleware |
| `server/middleware/checkPermissions.js` | Role & permission middleware |
| `server/middleware/validateFinancial.js` | Financial validation & sanitization |

### Scripts

```bash
# Server scripts
npm run dev                    # Start with nodemon
npm run start                  # Production start
npm run migrate:uploads        # Migrate uploads to Google Drive
npm run reseq:dry              # Preview account resequencing
npm run reseq:apply            # Apply account resequencing

# Front-end scripts
npm run dev                    # Start Vite dev server
npm run build                  # Production build
npm run lint                   # ESLint check
npm run preview                # Preview production build
```

### Adding a New Feature

1. **Model:** Create/update Mongoose schema in `server/models/`
2. **Controller:** Add business logic in `server/controllers/`
3. **Route:** Define routes in `server/routes/` with appropriate middleware (`requireAuth`, `checkActionPermission`, `validateFinancialFields`)
4. **Frontend Page:** Create component in `front-end/src/pages/`
5. **Route:** Add to `App.jsx` route definitions
6. **Menu:** Add to `Home.jsx` sidebar menu (check permissions)

---

## Troubleshooting

### MongoDB DNS Resolution

If you see `querySrv ECONNREFUSED`, the DNS fix at the top of `server.js` sets Google/Cloudflare DNS servers:
```js
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
```

### Build Warnings

The chunk size warning for `index.js` (3.5MB) is expected for Ant Design + Recharts. For optimization, consider dynamic imports for report pages.

### Session Issues

If login seems to fail silently, check that `VITE_API_URL` points to the correct server and the CORS origin in `server.js` includes the frontend URL.
