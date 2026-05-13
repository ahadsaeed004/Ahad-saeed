import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getClientDb } from "./client";
import type {
  Employee,
  AttendanceLog,
  Device,
  AttendanceFilter,
  PaginatedResponse,
} from "@/types";

// ─── Collection References ────────────────────────────────────────────────────
export const COLLECTIONS = {
  EMPLOYEES: "employees",
  ATTENDANCE_LOGS: "attendance_logs",
  DEVICES: "devices",
  USERS: "users",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toISO(val: Timestamp | string | Date | undefined | null): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  return val;
}

function docToEmployee(snap: DocumentSnapshot): Employee {
  const d = snap.data()!;
  return {
    id: snap.id,
    name: d.name,
    employeeCode: d.employeeCode,
    department: d.department,
    email: d.email,
    phone: d.phone,
    position: d.position,
    isActive: d.isActive ?? true,
    createdAt: toISO(d.createdAt),
    updatedAt: toISO(d.updatedAt),
  };
}

function docToAttendanceLog(snap: DocumentSnapshot): AttendanceLog {
  const d = snap.data()!;
  return {
    id: snap.id,
    employeeId: d.employeeId,
    employeeCode: d.employeeCode,
    employeeName: d.employeeName,
    timestamp: toISO(d.timestamp),
    type: d.type,
    deviceId: d.deviceId,
    rawData: d.rawData,
    createdAt: toISO(d.createdAt),
  };
}

function docToDevice(snap: DocumentSnapshot): Device {
  const d = snap.data()!;
  return {
    id: snap.id,
    name: d.name,
    ipAddress: d.ipAddress,
    port: d.port,
    status: d.status ?? "offline",
    lastSync: d.lastSync ? toISO(d.lastSync) : null,
    deviceModel: d.deviceModel,
    location: d.location,
    integrationMode: d.integrationMode ?? "api",
    createdAt: toISO(d.createdAt),
    updatedAt: toISO(d.updatedAt),
  };
}

// ─── Employee Queries ─────────────────────────────────────────────────────────
export async function fetchEmployees(): Promise<Employee[]> {
  const q = query(
    collection(getClientDb(), COLLECTIONS.EMPLOYEES),
    where("isActive", "==", true),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToEmployee);
}

export async function fetchEmployeeByCode(
  code: string
): Promise<Employee | null> {
  const q = query(
    collection(getClientDb(), COLLECTIONS.EMPLOYEES),
    where("employeeCode", "==", code),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return docToEmployee(snap.docs[0]);
}

export function subscribeToEmployees(
  callback: (employees: Employee[]) => void
): Unsubscribe {
  const q = query(
    collection(getClientDb(), COLLECTIONS.EMPLOYEES),
    where("isActive", "==", true),
    orderBy("name", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToEmployee));
  });
}

// ─── Attendance Log Queries ───────────────────────────────────────────────────
export async function fetchAttendanceLogs(
  filter: AttendanceFilter = {}
): Promise<PaginatedResponse<AttendanceLog>> {
  const constraints: QueryConstraint[] = [orderBy("timestamp", "desc")];
  const pageSize = filter.limit ?? 50;

  if (filter.startDate) {
    constraints.push(
      where("timestamp", ">=", new Date(filter.startDate).toISOString())
    );
  }
  if (filter.endDate) {
    constraints.push(
      where("timestamp", "<=", new Date(filter.endDate).toISOString())
    );
  }
  if (filter.employeeId) {
    constraints.push(where("employeeId", "==", filter.employeeId));
  }
  if (filter.deviceId) {
    constraints.push(where("deviceId", "==", filter.deviceId));
  }

  constraints.push(limit(pageSize + 1)); // fetch one extra to know if hasMore

  const q = query(collection(getClientDb(), COLLECTIONS.ATTENDANCE_LOGS), ...constraints);
  const snap = await getDocs(q);
  const docs = snap.docs.map(docToAttendanceLog);
  const hasMore = docs.length > pageSize;

  return {
    data: hasMore ? docs.slice(0, pageSize) : docs,
    total: snap.size,
    page: filter.page ?? 1,
    limit: pageSize,
    hasMore,
  };
}

export function subscribeToTodayAttendance(
  callback: (logs: AttendanceLog[]) => void
): Unsubscribe {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const q = query(
    collection(getClientDb(), COLLECTIONS.ATTENDANCE_LOGS),
    where("timestamp", ">=", todayStart.toISOString()),
    where("timestamp", "<=", todayEnd.toISOString()),
    orderBy("timestamp", "desc"),
    limit(100)
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToAttendanceLog));
  });
}

// ─── Device Queries ───────────────────────────────────────────────────────────
export async function fetchDevices(): Promise<Device[]> {
  const q = query(
    collection(getClientDb(), COLLECTIONS.DEVICES),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToDevice);
}

export function subscribeToDevices(
  callback: (devices: Device[]) => void
): Unsubscribe {
  const q = query(
    collection(getClientDb(), COLLECTIONS.DEVICES),
    orderBy("name", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(docToDevice));
  });
}
