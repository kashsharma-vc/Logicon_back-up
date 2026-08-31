# Main Logicon ERP & FieldSense Platform — Detailed System Architecture (As-Built)

This document provides the authoritative technical overview of the **Main Logicon ERP/ATS** and **FieldSense Mobile Workforce Management System**, detailing the post-Phase 0–4 as-built architecture, entitlement matrices, JWT security schemas, transactional lifecycle workflows, and database schemas.

---

## 1. Directory & System Architecture Overview

The platform consists of two integrated product ecosystems:
1. **Main Logicon ERP/ATS**: Enterprise Resource Planning & Applicant Tracking System (`BE-Logicon-connect-ATS-main` Django backend on port 8001 + `FE-Logicon-Connect-ATS-main` React frontend on port 5173).
2. **FieldSense Platform**: Field Tracking & Workforce Operations System (`backend` Django backend on port 8000 + `frontend` PWA frontend on port 8080).

```
+-------------------------------------------------------------------------------+
|                            LOGICON ERP & ATS                                  |
|                                                                               |
|  +---------------------------+             +-------------------------------+  |
|  | FE-Logicon-Connect (5173) |             | BE-Logicon-Connect (8001)     |  |
|  | - React 18 + Vite         | <---------> | - Django 5.x + DRF            |  |
|  | - Route Guard (CAP)       |   REST API  | - JWT Claim Serializer        |  |
|  | - Standalone /field-login |             | - Celery Async Tasks          |  |
|  +---------------------------+             +---------------+---------------+  |
+-----------------------------------------------------------|-------------------+
                                                            |
                                        Service Token Push  |  SSO Iframe & PWA Handoff
                                        POST /api/internal/ |  POST /api/token/
                                                            |
+-----------------------------------------------------------v-------------------+
|                            FIELDSENSE PLATFORM                                |
|                                                                               |
|  +---------------------------+             +-------------------------------+  |
|  | FieldSense Frontend (8080)|             | FieldSense Backend (8000)     |  |
|  | - React + PWA Manifest    | <---------> | - SharedJWTAuthentication     |  |
|  | - Mobile Employee Portal  |   REST API  | - Push & JIT Engine           |  |
|  | - URL Token Sanitization  |             | - Redis JTI Blocklist         |  |
|  +---------------------------+             +-------------------------------+  |
+-------------------------------------------------------------------------------+
```

---

## 2. Entitlement Matrix & Role-Based Access Control (RBAC)

Access to FieldSense features is governed by a unified entitlement model driven by Logicon's JWT claims.

### 2.1 Entitlement Matrix Across Access Channels

| Role Code | `field_access` | `field_role` | `field_site_scope` | Iframe SSO Access | Mobile PWA Access | Internal API Access |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `admin` | `True` | `ADMIN` | `["*"]` | **ALLOW** (Full Admin) | **ALLOW** | **DENY** (Requires Service Token) |
| `operations_manager` | `True` | `MANAGER` | Assigned Sites | **ALLOW** (Scoped) | **ALLOW** | **DENY** |
| `operations_executive` | `True` | `MANAGER` | Assigned Sites | **ALLOW** (Scoped) | **ALLOW** | **DENY** |
| `site_manager` | `True` | `MANAGER` | Site Specific | **ALLOW** (Scoped) | **ALLOW** | **DENY** |
| `field_supervisor` | `True` | `MANAGER` | Site Specific | **ALLOW** (Scoped) | **ALLOW** | **DENY** |
| `sales_manager` | `True` | `SALES` | Assigned Scope | **ALLOW** (CRM/Territory) | **ALLOW** | **DENY** |
| `sales_executive` | `True` | `SALES` | Assigned Scope | **ALLOW** (CRM/Territory) | **ALLOW** | **DENY** |
| Deployed `EMPLOYEE` | `True` | `EMPLOYEE` | Active Site | **DENY** (Route Guarded) | **ALLOW** (PIN Login) | **DENY** |
| Non-Entitled User | `False` | `null` | `[]` | **DENY** (401/403) | **DENY** | **DENY** |
| Service Account | N/A | N/A | N/A | N/A | N/A | **ALLOW** (Service JWT) |

---

## 3. JWT Claim Schema & Authentication Engine

### 3.1 Custom JWT Claim Structure

Logicon's `EmailTokenObtainPairSerializer` computes and emits four mandatory claims in every issued JWT access token:

```json
{
  "token_type": "access",
  "exp": 1785768000,
  "iat": 1785681600,
  "jti": "8f3b2d1c9e4a",
  "user_id": 1042,
  "email": "ops.manager@logicon.com",
  "is_staff": false,
  "field_access": true,
  "field_role": "MANAGER",
  "field_site_scope": ["SITE-101", "SITE-102"],
  "deployment_site_id": null
}
```

### 3.2 FieldSense `SharedJWTAuthentication` Execution Flow

```
Incoming Request HTTP Authorization: Bearer <JWT>
                    │
                    ▼
     Validate Cryptographic Signature (HS256)
                    │
                    ├─► [INVALID] ──► Raise AuthenticationFailed (401)
                    │
                    ▼
       Check Redis JTI Blocklist
                    │
                    ├─► [REVOKED] ──► Raise AuthenticationFailed (401)
                    │
                    ▼
       Inspect `field_access` Claim
                    │
                    ├─► [FALSE] ────► Raise AuthenticationFailed (401)
                    │
                    ├─► [ABSENT] ───► Legacy Fallback (is_staff / user_type)
                    │
                    ▼
      Attach Claims & Scope to Request
      request.field_role = payload['field_role']
      request.field_site_scope = payload['field_site_scope']
```

---

## 4. Operational Workflows & Sequence Diagrams

### 4.1 Iframe SSO (Ops / Admin / Sales)

```
User (Browser)               Logicon Frontend              Logicon Backend             FieldSense Backend
      │                             │                             │                             │
      ├─ Navigate /field-tracking ─►│                             │                             │
      │                             ├─ GET /api/token/ ──────────►│                             │
      │                             │  (With user credentials)    │                             │
      │                             │◄─ Return JWT + Claims ──────┤                             │
      │                             │   (field_access=true)       │                             │
      ├─ Render <iframe src= ───────┴─────────────────────────────┴────────────────────────────►│
      │  "http://fieldsense:8000/?token=JWT&embedded=true">                                     │
      │                                                                                         │
      │◄─ Validate Token, Apply CSP frame-ancestors, Render Scoped Dashboard ───────────────────┤
```

### 4.2 Standalone Mobile PIN Login & PWA Token Handoff

```
Field Worker (Mobile)        Logicon Frontend (/field-login)    Logicon Backend         FieldSense PWA (8080)
      │                                    │                           │                          │
      ├─ Submit OrgID + Code + PIN ───────►│                           │                          │
      │                                    ├─ POST /field-employee ───►│                          │
      │                                    │  -token/                  │                          │
      │                                    │◄─ Return Access+Refresh ──┤                          │
      │                                    │   (field_role=EMPLOYEE)   │                          │
      ├─ Redirect to PWA ──────────────────┴───────────────────────────┴─────────────────────────►│
      │  http://fieldsense:8080/?token=JWT                                                       │
      │                                                                                          │
      │◄─ SSOHandler consumes token, saves to sessionStorage, sanitizes URL bar ─────────────────┤
      │◄─ Render EmployeePortal.tsx (Check-In / Visit Logs / Attendance) ───────────────────────┤
```

### 4.3 Hybrid Provisioning (Celery Push + JIT Fallback)

```
Logicon Lifecycle Hook          Logicon Celery Worker             FieldSense Backend
         │                                │                                │
         ├─ activate_deployment()         │                                │
         │  (Inside DB transaction)       │                                │
         ├─ transaction.on_commit() ─────►│                                │
         │  Enqueue task                  ├─ POST /api/internal/ ─────────►│
         │                                │  provision-employee/           ├─ Create Employee
         │                                │  (Service Account Token)       │  & User Record
         │                                │◄─ HTTP 201 Created ────────────┤  Assign Scope
```

### 4.4 Employee Offboarding & Instant Revocation

```
Logicon Lifecycle Hook          Logicon Celery Worker             FieldSense Backend            Redis Blocklist
         │                                │                                │                           │
         ├─ exit_employee()               │                                │                           │
         ├─ transaction.on_commit() ─────►│                                │                           │
         │  Enqueue deprovision task      ├─ POST /api/internal/ ─────────►│                           │
         │                                │  deprovision-employee/         ├─ accountStatus = False    │
         │                                │                                ├─ Force Check-Out Shift    │
         │                                │                                ├─ POST /revoke-token/ ────►│ Store JTI in Redis
         │                                │◄─ HTTP 200 OK ─────────────────┴───────────────────────────┤ TTL = Expiration
```

---

## 5. Database Schema Extensions

### 5.1 Logicon Backend (`apps/deployment/models.py`)

#### Model: `Employee`
* `field_pin_hash`: `CharField(max_length=128, blank=True)` — Bcrypt hash of 6-digit PIN.
* `field_provisioned_at`: `DateTimeField(null=True, blank=True)` — Provisioning timestamp.
* `field_provisioning_status`: `CharField(choices=['pending', 'provisioned', 'failed', 'deprovisioned'])`
* `field_login_failed_attempts`: `IntegerField(default=0)` — Failure tracker for PIN brute-force defense.
* `field_is_locked`: `BooleanField(default=False)` — Account lockout flag.

#### Model: `FieldProvisioningLog`
* `employee`: `ForeignKey(Employee)`
* `idempotency_key`: `CharField(max_length=64, unique=True)` — `SHA256(employee_id:deployment_id:action)`
* `action`: `CharField(choices=['provision', 'deprovision', 'pin_reset'])`
* `status`: `CharField(choices=['pending', 'success', 'failed'])`
* `attempts`: `IntegerField(default=1)`
* `error_detail`: `TextField(blank=True)`

---

### 5.2 FieldSense Backend (`backend/core/models.py`)

#### Model: `Employee`
* `logicon_employee_id`: `IntegerField(null=True, blank=True, db_index=True)` — Foreign key mapping to Logicon.
* `logicon_deployment_id`: `IntegerField(null=True, blank=True)` — Active deployment ID.
* `current_site_scope`: `JSONField(default=list)` — Array of site IDs assigned to worker.

#### Model: `ProvisioningLog`
* `idempotency_key`: `CharField(max_length=64, unique=True)`
* `action`: `CharField(max_length=32)`
* `status`: `CharField(max_length=32)`

---

## 6. Risk Register Status (R1–R11)

| Risk ID | Threat Description | Status | Verification & Resolution Control |
| :--- | :--- | :---: | :--- |
| **R1** | Unprotected route on `/field-tracking/*` | **RESOLVED** | Route guarded with `<RequireCapability anyOf={[CAP.FIELD_TRACKING_READ]} />` in `routes.tsx`. |
| **R2** | Sales role conflict breaking production | **RESOLVED** | `sales_manager` and `sales_executive` mapped to `field_access=True, field_role='SALES'`. |
| **R3** | Non-entitled user accessing FieldSense | **RESOLVED** | `SharedJWTAuthentication` enforces `field_access` claim gate before JIT logic. |
| **R4** | Mobile PIN brute-forcing | **RESOLVED** | 10-attempt rate limiting and account lockout (`field_is_locked=True`) on `/api/field-employee-token/`. |
| **R5** | Plaintext PIN leak in database/logs | **RESOLVED** | Raw 6-digit PIN is bcrypt-hashed into `field_pin_hash`; plaintext PIN is never logged or stored. |
| **R6** | Unauthorized access to internal push API | **RESOLVED** | `/api/internal/*` guarded by `ServiceAccountAuthentication` enforcing `user_type='service'` and IP restrictions. |
| **R7** | Clickjacking / Untrusted iframe embedding | **RESOLVED** | `SecurityHeadersMiddleware` sets CSP `frame-ancestors` restricted strictly to Logicon origin (`http://localhost:5173`). |
| **R8** | Stale site scope window post-transfer | **RESOLVED** | Real-time scope validation in `check_site_scope_validity()` + instant JTI Redis blocklist revocation. |
| **R9** | In-memory Celery broker in production | **RESOLVED** | Broker configured to Redis (`redis://localhost:6379/0`), queue `fieldsense_provisioning` separated with dedicated concurrency. |
| **R10** | Unmonitored dead-letter task failures | **RESOLVED** | Sentry & PagerDuty webhook dispatcher (`apps/monitoring/alerts.py`) + `/api/deployment/fieldsense-status/` endpoint built. |
| **R11** | Locked-out field worker recovery gap | **RESOLVED** | HR-facing `reset-field-pin` endpoint added to `EmployeeViewSet` with capability guard `employee.update` and audit logging. |
