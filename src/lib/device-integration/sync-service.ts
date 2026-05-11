/**
 * Device Sync Service
 * ===================
 * Polls all API-mode devices and imports their logs into Firestore.
 * Called by:
 *   - GET /api/devices/sync (triggered by Vercel cron or external cron)
 *   - Manually via the admin dashboard
 */

import { getAdminDb } from "@/lib/firebase/admin";
import { createDeviceAdapter } from "./adapter-factory";
import { normalizeAttendanceType } from "@/lib/utils";
import type { Device, RawAttendanceLog } from "@/types";
import { FieldValue } from "firebase-admin/firestore";

const COLLECTIONS = {
  EMPLOYEES: "employees",
  ATTENDANCE_LOGS: "attendance_logs",
  DEVICES: "devices",
};

export interface SyncResult {
  deviceId: string;
  deviceName: string;
  imported: number;
  skipped: number;
  errors: string[];
  duration: number;
}

export async function syncDevice(device: Device): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    deviceId: device.id,
    deviceName: device.name,
    imported: 0,
    skipped: 0,
    errors: [],
    duration: 0,
  };

  try {
    const adapter = await createDeviceAdapter(device);
    const since = device.lastSync ? new Date(device.lastSync) : undefined;
    const rawLogs = await adapter.fetchLogs(since);

    if (rawLogs.length === 0) {
      result.duration = Date.now() - start;
      return result;
    }

    // Process logs in batches of 500 (Firestore limit)
    const BATCH_SIZE = 500;
    const db = getAdminDb();

    for (let i = 0; i < rawLogs.length; i += BATCH_SIZE) {
      const chunk = rawLogs.slice(i, i + BATCH_SIZE);
      const { imported, skipped, errors } = await processLogBatch(
        db,
        chunk,
        device.id
      );
      result.imported += imported;
      result.skipped += skipped;
      result.errors.push(...errors);
    }

    // Update device's lastSync timestamp
    await db.collection(COLLECTIONS.DEVICES).doc(device.id).update({
      lastSync: new Date().toISOString(),
      status: "online",
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    result.errors.push(msg);

    // Mark device as error
    try {
      const db = getAdminDb();
      await db.collection(COLLECTIONS.DEVICES).doc(device.id).update({
        status: "error",
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch { /* ignore update failure */ }
  }

  result.duration = Date.now() - start;
  return result;
}

export async function syncAllDevices(): Promise<SyncResult[]> {
  const db = getAdminDb();
  const devicesSnap = await db
    .collection(COLLECTIONS.DEVICES)
    .where("integrationMode", "==", "api")
    .get();

  const devices = devicesSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Device[];

  // Run in parallel (with concurrency limit)
  const results = await Promise.allSettled(devices.map(syncDevice));

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          deviceId: devices[i].id,
          deviceName: devices[i].name,
          imported: 0,
          skipped: 0,
          errors: [r.reason?.message ?? "Sync failed"],
          duration: 0,
        }
  );
}

// ─── Internal helpers ─────────────────────────────────────────────────────────
async function processLogBatch(
  db: FirebaseFirestore.Firestore,
  logs: RawAttendanceLog[],
  deviceId: string
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Fetch all referenced employee codes in one query
  const codes = [...new Set(logs.map((l) => l.employeeCode))];
  const employeeMap = await fetchEmployeeMap(db, codes);

  const batch = db.batch();
  let batchCount = 0;

  for (const log of logs) {
    const employee = employeeMap.get(log.employeeCode);
    if (!employee) {
      skipped++;
      continue;
    }

    // Deterministic ID for idempotency: log_{employeeCode}_{timestamp}
    // Replace characters that might be problematic for doc IDs if necessary, 
    // though Firestore doc IDs are quite flexible.
    const docId = `log_${employee.employeeCode}_${log.timestamp}`.replace(/[:.]/g, "-");
    const ref = db.collection(COLLECTIONS.ATTENDANCE_LOGS).doc(docId);

    batch.set(ref, {
      employeeId: employee.id,
      employeeCode: log.employeeCode,
      employeeName: employee.name,
      timestamp: log.timestamp,
      type: log.type ?? normalizeAttendanceType(log.rawType),
      deviceId,
      rawData: { rawType: log.rawType },
      createdAt: new Date().toISOString(),
    }, { merge: true }); // Use merge to avoid overwriting if it exists, though data should be identical

    imported++;
    batchCount++;
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { imported, skipped, errors };
}

async function fetchEmployeeMap(
  db: FirebaseFirestore.Firestore,
  codes: string[]
): Promise<Map<string, { id: string; name: string; employeeCode: string }>> {
  const map = new Map<string, { id: string; name: string; employeeCode: string }>();
  if (codes.length === 0) return map;

  // Firestore `in` query supports up to 30 items
  const CHUNK = 30;
  for (let i = 0; i < codes.length; i += CHUNK) {
    const chunk = codes.slice(i, i + CHUNK);
    const snap = await db
      .collection(COLLECTIONS.EMPLOYEES)
      .where("employeeCode", "in", chunk)
      .where("isActive", "==", true)
      .get();

    snap.docs.forEach((d) => {
      const data = d.data();
      map.set(data.employeeCode, { id: d.id, name: data.name, employeeCode: data.employeeCode });
    });
  }

  return map;
}
