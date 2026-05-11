/**
 * Firestore Seed Script
 * =====================
 * Populates the database with sample data for development/testing.
 *
 * Usage:
 *   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... \
 *   npx ts-node --project tsconfig.json scripts/seed-firestore.ts
 *
 * Or set env vars in .env.local and run:
 *   npx tsx scripts/seed-firestore.ts
 */

import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: privateKey!,
  }),
});

const db = admin.firestore();

// ─── Sample Data ──────────────────────────────────────────────────────────────
const DEPARTMENTS = ["Engineering", "HR", "Finance", "Operations", "Marketing"];

const EMPLOYEES = [
  { name: "Ali Hassan",      employeeCode: "E001", department: "Engineering", position: "Senior Engineer",    email: "ali@company.com" },
  { name: "Sara Khan",       employeeCode: "E002", department: "HR",          position: "HR Manager",         email: "sara@company.com" },
  { name: "Usman Ahmed",     employeeCode: "E003", department: "Finance",     position: "Accountant",         email: "usman@company.com" },
  { name: "Fatima Malik",    employeeCode: "E004", department: "Engineering", position: "Frontend Developer", email: "fatima@company.com" },
  { name: "Bilal Raza",      employeeCode: "E005", department: "Operations",  position: "Operations Lead",    email: "bilal@company.com" },
  { name: "Ayesha Siddiqui", employeeCode: "E006", department: "Marketing",   position: "Marketing Manager",  email: "ayesha@company.com" },
  { name: "Hamza Sheikh",    employeeCode: "E007", department: "Engineering", position: "Backend Developer",  email: "hamza@company.com" },
  { name: "Zara Qureshi",    employeeCode: "E008", department: "Finance",     position: "Financial Analyst",  email: "zara@company.com" },
];

const DEVICES = [
  {
    name: "Main Entrance",
    ipAddress: "192.168.1.100",
    port: 8080,
    location: "Ground Floor - Main Gate",
    deviceModel: "ZKTeco SpeedFace-V5L",
    integrationMode: "api",
    status: "online",
  },
  {
    name: "Server Room",
    ipAddress: "192.168.1.101",
    port: 8080,
    location: "3rd Floor - Server Room",
    deviceModel: "ZKTeco F22",
    integrationMode: "push",
    status: "offline",
  },
];

async function seed() {
  console.log("🌱 Seeding Firestore (Idempotent)...\n");

  const batch = db.batch();
  const now = new Date().toISOString();

  // ── Employees ────────────────────────────────────────────────────────────
  console.log("Preparing employees...");
  const employeeData: { id: string, name: string, code: string }[] = [];

  for (const emp of EMPLOYEES) {
    const docId = `demo_${emp.employeeCode}`;
    const ref = db.collection("employees").doc(docId);
    batch.set(ref, {
      ...emp,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    
    employeeData.push({ id: docId, name: emp.name, code: emp.employeeCode });
    console.log(`  + ${emp.name} (${emp.employeeCode})`);
  }

  // ── Devices ───────────────────────────────────────────────────────────────
  console.log("\nPreparing devices...");
  const deviceIds: string[] = [];

  for (let i = 0; i < DEVICES.length; i++) {
    const device = DEVICES[i];
    const docId = `demo_dev_${i + 1}`;
    const ref = db.collection("devices").doc(docId);
    batch.set(ref, {
      ...device,
      lastSync: null,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    
    deviceIds.push(docId);
    console.log(`  + ${device.name}`);
  }

  // ── Attendance Logs (last 7 days) ─────────────────────────────────────────
  console.log("\nGenerating attendance logs for last 7 days...");
  const mainDeviceId = deviceIds[0];
  let logCount = 0;

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().slice(0, 10);

    for (const emp of employeeData) {
      // Skip ~20% (simulate absences)
      if (Math.random() < 0.2) continue;

      // Check-in (Deterministic time for demo consistency)
      // For more "realism", we could use random mins but keep it consistent based on seed
      const checkinTime = `${dateStr}T09:00:00.000Z`;
      const ciDocId = `log_${emp.code}_${checkinTime}`.replace(/[:.]/g, "-");
      
      batch.set(db.collection("attendance_logs").doc(ciDocId), {
        employeeId: emp.id,
        employeeCode: emp.code,
        employeeName: emp.name,
        timestamp: checkinTime,
        type: "check-in",
        deviceId: mainDeviceId,
        rawData: { rawType: 0 },
        createdAt: now,
      }, { merge: true });
      logCount++;

      // Check-out
      const checkoutTime = `${dateStr}T18:00:00.000Z`;
      const coDocId = `log_${emp.code}_${checkoutTime}`.replace(/[:.]/g, "-");
      
      batch.set(db.collection("attendance_logs").doc(coDocId), {
        employeeId: emp.id,
        employeeCode: emp.code,
        employeeName: emp.name,
        timestamp: checkoutTime,
        type: "check-out",
        deviceId: mainDeviceId,
        rawData: { rawType: 1 },
        createdAt: now,
      }, { merge: true });
      logCount++;
    }
  }

  console.log(`\nCommitting ${EMPLOYEES.length + DEVICES.length + logCount} operations...`);
  await batch.commit();

  console.log("\n✅ Seed complete!\n");
  console.log("Seeded collections:");
  console.log(`  employees       → ${EMPLOYEES.length} records`);
  console.log(`  devices         → ${DEVICES.length} records`);
  console.log(`  attendance_logs → ${logCount} records`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
