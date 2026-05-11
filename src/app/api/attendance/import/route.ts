import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { ImportAttendanceSchema } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  verifyDeviceSecret,
  verifyAuthToken,
} from "@/lib/utils/auth-middleware";
import { normalizeAttendanceType } from "@/lib/utils";
import { FieldValue } from "firebase-admin/firestore";

const COLLECTIONS = {
  EMPLOYEES: "employees",
  ATTENDANCE_LOGS: "attendance_logs",
  DEVICES: "devices",
};

/**
 * POST /api/attendance/import
 * Accepts: { deviceId, logs: [...], secret? }
 * Auth: device secret OR admin JWT
 *
 * This is the main ingestion endpoint for biometric devices.
 * Call it with either:
 *   - Authorization: Bearer <admin-token>
 *   - body.secret: <API_SECRET_KEY> (for device/bridge push mode)
 */
export async function POST(request: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  let isAuthorized = false;

  // Try device secret first (most common for device integrations)
  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const bodyObj = body as Record<string, unknown>;
  if (bodyObj?.secret && verifyDeviceSecret(bodyObj.secret as string)) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    try {
      await verifyAuthToken(request);
      isAuthorized = true;
    } catch {
      return errorResponse(
        "Unauthorized: provide a valid Bearer token or device secret",
        401
      );
    }
  }

  // ── 2. Validate ──────────────────────────────────────────────────────────
  const parsed = ImportAttendanceSchema.safeParse(bodyObj);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten());
  }

  const { deviceId, logs } = parsed.data;
  const db = getAdminDb();

  // ── 3. Verify device exists ───────────────────────────────────────────────
  const deviceDoc = await db.collection(COLLECTIONS.DEVICES).doc(deviceId).get();
  if (!deviceDoc.exists) {
    return errorResponse(`Device not found: ${deviceId}`, 404);
  }

  // ── 4. Fetch employee map ─────────────────────────────────────────────────
  const codes = [...new Set(logs.map((l) => l.employeeCode))];
  const employeeMap = await fetchEmployeeMap(db, codes);

  // ── 5. Process logs ───────────────────────────────────────────────────────
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Process in Firestore batch chunks of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < logs.length; i += BATCH_SIZE) {
    const chunk = logs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    let batchCount = 0;

    for (const log of chunk) {
      const employee = employeeMap.get(log.employeeCode);
      if (!employee) {
        skipped++;
        errors.push(`Employee not found: ${log.employeeCode}`);
        continue;
      }

      // Deduplication check
      const existsSnap = await db
        .collection(COLLECTIONS.ATTENDANCE_LOGS)
        .where("employeeId", "==", employee.id)
        .where("timestamp", "==", log.timestamp)
        .limit(1)
        .get();

      if (!existsSnap.empty) {
        skipped++;
        continue;
      }

      const ref = db.collection(COLLECTIONS.ATTENDANCE_LOGS).doc();
      batch.set(ref, {
        employeeId: employee.id,
        employeeCode: log.employeeCode,
        employeeName: employee.name,
        timestamp: log.timestamp,
        type: log.type ?? normalizeAttendanceType(log.rawType),
        deviceId,
        rawData: { rawType: log.rawType },
        createdAt: new Date().toISOString(),
      });

      batchCount++;
      imported++;
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  }

  // ── 6. Update device lastSync ─────────────────────────────────────────────
  await db.collection(COLLECTIONS.DEVICES).doc(deviceId).update({
    lastSync: new Date().toISOString(),
    status: "online",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return successResponse(
    {
      imported,
      skipped,
      errors: errors.slice(0, 20), // cap error list in response
      total: logs.length,
    },
    200
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchEmployeeMap(
  db: FirebaseFirestore.Firestore,
  codes: string[]
): Promise<Map<string, { id: string; name: string }>> {
  const map = new Map<string, { id: string; name: string }>();
  if (codes.length === 0) return map;

  const CHUNK = 30; // Firestore `in` limit
  for (let i = 0; i < codes.length; i += CHUNK) {
    const snap = await db
      .collection(COLLECTIONS.EMPLOYEES)
      .where("employeeCode", "in", codes.slice(i, i + CHUNK))
      .where("isActive", "==", true)
      .get();
    snap.docs.forEach((d) => {
      map.set(d.data().employeeCode, { id: d.id, name: d.data().name });
    });
  }
  return map;
}
