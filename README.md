# AttendSync — Biometric Attendance Management System

A production-ready attendance management system built with **Next.js 14**, **Firebase Firestore**, and a modular biometric device integration layer.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                               │
│  Next.js Dashboard (React) ←── Firestore onSnapshot (real-time)     │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────────┐
│                     NEXT.JS API ROUTES                               │
│  /api/attendance/import  POST  ← Device Bridge / Admin              │
│  /api/attendance         GET   ← Dashboard / Reports                │
│  /api/employees          CRUD  ← Admin UI                           │
│  /api/devices/sync       GET   ← Vercel Cron (every 5 min)          │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ Firebase Admin SDK
┌───────────────────────────▼─────────────────────────────────────────┐
│                      FIREBASE FIRESTORE                              │
│  employees / attendance_logs / devices                               │
└─────────────────────────────────────────────────────────────────────┘

Device Integration (3 modes):
  API Mode  →  Server polls device HTTP endpoint (Vercel cron)
  Push Mode →  Device/bridge POSTs to /api/attendance/import
  USB Bridge→  Local script (scripts/usb-bridge.js) reads USB device
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Hosting | Vercel (frontend + API) |
| Real-time | Firestore `onSnapshot` listeners |
| Validation | Zod |
| Charts | Recharts |
| CI/CD | GitHub Actions |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── attendance/
│   │   │   ├── route.ts           # GET /api/attendance (with filters)
│   │   │   └── import/
│   │   │       └── route.ts       # POST /api/attendance/import
│   │   ├── employees/
│   │   │   ├── route.ts           # GET, POST /api/employees
│   │   │   └── [id]/
│   │   │       └── route.ts       # GET, PUT, DELETE /api/employees/:id
│   │   ├── devices/
│   │   │   ├── route.ts           # GET, POST /api/devices
│   │   │   ├── sync/route.ts      # GET /api/devices/sync (cron trigger)
│   │   │   └── simulate/route.ts  # POST (dev only: mock device push)
│   │   └── dashboard/
│   │       └── stats/route.ts     # GET /api/dashboard/stats
│   ├── dashboard/
│   │   ├── layout.tsx             # Auth-protected layout
│   │   └── page.tsx               # Dashboard with stats + live feed
│   ├── attendance/
│   │   └── page.tsx               # Attendance table with filters
│   ├── employees/
│   │   └── page.tsx               # Employee CRUD
│   ├── reports/
│   │   └── page.tsx               # Monthly charts + CSV export
│   └── login/
│       └── page.tsx               # Firebase Auth (email + Google)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   └── Topbar.tsx             # Header with user info
│   ├── dashboard/
│   │   └── LiveAttendanceFeed.tsx # Real-time onSnapshot feed
│   └── ui/
│       └── StatCard.tsx           # Reusable stat card
├── lib/
│   ├── firebase/
│   │   ├── client.ts              # Firebase client SDK init
│   │   ├── admin.ts               # Firebase Admin SDK init
│   │   └── firestore.ts           # Typed Firestore queries + subscriptions
│   ├── device-integration/
│   │   ├── adapter-factory.ts     # Factory pattern — routes to correct adapter
│   │   ├── zkteco-adapter.ts      # ZKTeco HTTP API adapter
│   │   ├── usb-bridge-adapter.ts  # USB bridge mode adapter
│   │   └── sync-service.ts        # Orchestrates polling all API-mode devices
│   ├── utils/
│   │   ├── index.ts               # cn(), formatDate(), exportToCSV(), etc.
│   │   └── auth-middleware.ts     # verifyAuthToken(), withAuth(), successResponse()
│   └── validations/
│       └── index.ts               # Zod schemas for all API inputs
├── hooks/
│   ├── useAuth.ts                 # Firebase auth state hook
│   ├── useLiveAttendance.ts       # Firestore onSnapshot hook (today's logs)
│   └── useEmployees.ts            # Employees + CRUD operations
└── types/
    └── index.ts                   # All TypeScript interfaces
scripts/
├── seed-firestore.ts              # Populate DB with sample data
└── usb-bridge.js                  # Local bridge for USB-connected devices
```

---

## Firestore Data Model

### `employees`
```typescript
{
  id: string;            // Firestore doc ID
  name: string;
  employeeCode: string;  // Matches biometric device user ID
  department: string;
  email?: string;
  phone?: string;
  position?: string;
  isActive: boolean;     // Soft delete flag
  createdAt: string;     // ISO 8601
  updatedAt: string;
}
```

### `attendance_logs`
```typescript
{
  id: string;
  employeeId: string;    // Reference to employees doc
  employeeCode: string;  // Denormalized for query performance
  employeeName: string;  // Denormalized for display
  timestamp: string;     // When punch occurred on device (ISO 8601)
  type: "check-in" | "check-out";
  deviceId: string;      // Reference to devices doc
  rawData?: object;      // Original device payload (audit trail)
  createdAt: string;     // When this record was written to Firestore
}
```

### `devices`
```typescript
{
  id: string;
  name: string;
  ipAddress: string;
  port?: number;
  status: "online" | "offline" | "error";
  lastSync: string | null;
  deviceModel?: string;
  location?: string;
  integrationMode: "api" | "push" | "usb-bridge";
  createdAt: string;
  updatedAt: string;
}
```

---

## Setup Guide

### 1. Clone & Install

```bash
git clone <your-repo>
cd attendance-system
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → Create project
2. Enable **Authentication** → Email/Password + Google
3. Enable **Firestore** → Start in Production mode
4. Generate **Service Account** key: Project Settings → Service Accounts → Generate new private key
5. Deploy Firestore rules and indexes:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use <your-project-id>
   firebase deploy --only firestore
   ```

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

**Required variables:**
- `NEXT_PUBLIC_FIREBASE_*` — from Firebase Console → Project Settings → Your apps
- `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` — from Service Account JSON
- `API_SECRET_KEY` — strong random string (used by devices to authenticate)
- `CRON_SECRET` — random string for Vercel cron authentication

### 4. Seed the Database (Development)

```bash
npx tsx scripts/seed-firestore.ts
```

This creates 8 employees, 2 devices, and 7 days of attendance history.

### 5. Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### 6. Create First Admin User

After signing in via Firebase Auth, manually set the user role in Firestore:

```
users/{uid} → { role: "admin", email: "...", displayName: "..." }
```

---

## Device Integration

### Mode 1: API Mode (ZKTeco HTTP)

Configure the device in Firestore with `integrationMode: "api"`. The Vercel cron job at `/api/devices/sync` runs every 5 minutes and polls all API-mode devices.

The `ZKTecoAdapter` (`src/lib/device-integration/zkteco-adapter.ts`) handles ZKTeco devices. To support a different brand, create a new adapter implementing the `DeviceAdapter` interface and register it in `adapter-factory.ts`.

### Mode 2: Push Mode

The device (or a local agent) POSTs attendance logs directly to:

```
POST /api/attendance/import
Content-Type: application/json

{
  "deviceId": "your-device-firestore-id",
  "secret": "your-API_SECRET_KEY",
  "logs": [
    {
      "employeeCode": "E001",
      "timestamp": "2024-03-15T08:30:00.000Z",
      "type": "check-in"
    }
  ]
}
```

### Mode 3: USB Bridge

Run the bridge script on the local machine connected to the device:

```bash
API_URL=https://your-app.vercel.app \
API_SECRET=your_secret \
DEVICE_IP=192.168.1.100 \
DEVICE_ID=firestore-device-id \
node scripts/usb-bridge.js
```

Edit the script to use `node-zklib` or another device library for your hardware.

### Testing with the Simulator

In development, simulate device pushes:

```bash
curl -X POST http://localhost:3000/api/devices/simulate \
  -H "Content-Type: application/json" \
  -d '{"employeeCodes": ["E001","E002","E003"], "deviceId": "your-device-id", "count": 6}'
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/attendance/import` | Device secret OR JWT | Import logs from device |
| GET | `/api/attendance` | JWT | List logs with filters |
| GET | `/api/employees` | JWT | List all employees |
| POST | `/api/employees` | JWT | Create employee |
| PUT | `/api/employees/:id` | JWT | Update employee |
| DELETE | `/api/employees/:id` | JWT | Soft-delete employee |
| GET | `/api/devices` | JWT | List devices |
| POST | `/api/devices` | JWT | Register device |
| GET | `/api/devices/sync` | Cron secret OR JWT | Trigger device sync |
| POST | `/api/devices/simulate` | None (dev only) | Simulate device push |
| GET | `/api/dashboard/stats` | JWT | Today's summary stats |

---

## Deployment

### Vercel

```bash
npm install -g vercel
vercel --prod
```

Set all environment variables in Vercel Dashboard → Settings → Environment Variables.

The `vercel.json` configures the cron job to hit `/api/devices/sync` every 5 minutes.

### Firebase Rules

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Security

- **API routes** require Firebase ID token (`Authorization: Bearer <token>`) or device secret
- **Firestore rules** block all direct client writes to `attendance_logs` — all writes go through Admin SDK
- **Device push** uses a shared secret (`API_SECRET_KEY`) — use HTTPS in production
- **Soft deletes** preserve all attendance history when employees are removed
- **Deduplication** prevents duplicate records from repeated device polls

---

## Adding a New Device Brand

1. Create `src/lib/device-integration/your-brand-adapter.ts`
2. Implement the `DeviceAdapter` interface:
   ```typescript
   export class YourBrandAdapter implements DeviceAdapter {
     async fetchLogs(since?: Date): Promise<RawAttendanceLog[]> { ... }
     async getStatus(): Promise<DeviceStatus> { ... }
   }
   ```
3. Register it in `adapter-factory.ts`:
   ```typescript
   case "your-mode":
     const { YourBrandAdapter } = await import("./your-brand-adapter");
     return new YourBrandAdapter(device);
   ```
4. Add the mode to the Zod schema in `src/lib/validations/index.ts`
# attendence
