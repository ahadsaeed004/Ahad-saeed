import {
  collection,
  doc,
  writeBatch,
} from "firebase/firestore";
import { getClientDb } from "./client";
import { COLLECTIONS } from "./firestore";

import demoData from "../../../demo-data.json";

const EMPLOYEES = demoData.employees;
const DEVICES = demoData.devices;

export async function seedDemoData() {
  console.log("🌱 Seeding Demo Data (Idempotent)...");
  const db = getClientDb();
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  try {
    // 1. Prepare Employees (Deterministic IDs based on code)
    const employeeData: { id: string, name: string, code: string }[] = [];
    for (const emp of EMPLOYEES) {
      const empRef = doc(db, COLLECTIONS.EMPLOYEES, `demo_${emp.employeeCode}`);
      batch.set(empRef, {
        ...emp,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      employeeData.push({ id: empRef.id, name: emp.name, code: emp.employeeCode });
    }

    // 2. Prepare Devices (Deterministic IDs)
    const deviceIds: string[] = [];
    for (let i = 0; i < DEVICES.length; i++) {
      const device = DEVICES[i];
      const devRef = doc(db, COLLECTIONS.DEVICES, `demo_dev_${i + 1}`);
      batch.set(devRef, {
        ...device,
        lastSync: null,
        createdAt: now,
        updatedAt: now,
      });
      deviceIds.push(devRef.id);
    }

    // 3. Prepare Attendance Logs (last 7 days)
    const mainDeviceId = deviceIds[0];
    let logCount = 0;

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().slice(0, 10);

      for (const emp of employeeData) {
        if (Math.random() < 0.15) continue;

        const ciTime = `${dateStr}T09:00:00Z`;
        const ciId = `demo_log_${emp.code}_${dateStr}_in`;
        batch.set(doc(db, COLLECTIONS.ATTENDANCE_LOGS, ciId), {
          employeeId: emp.id,
          employeeCode: emp.code,
          employeeName: emp.name,
          timestamp: ciTime,
          type: "check-in",
          deviceId: mainDeviceId,
          createdAt: now,
        });
        logCount++;

        const coTime = `${dateStr}T18:00:00Z`;
        const coId = `demo_log_${emp.code}_${dateStr}_out`;
        batch.set(doc(db, COLLECTIONS.ATTENDANCE_LOGS, coId), {
          employeeId: emp.id,
          employeeCode: emp.code,
          employeeName: emp.name,
          timestamp: coTime,
          type: "check-out",
          deviceId: mainDeviceId,
          createdAt: now,
        });
        logCount++;
      }
    }

    await batch.commit();
    return { success: true, message: "Demo data synced successfully!" };
  } catch (error) {
    console.error("Error seeding data:", error);
    return { success: false, error: String(error) };
  }
}
