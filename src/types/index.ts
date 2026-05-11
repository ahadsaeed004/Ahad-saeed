// ============================================================
// Core Domain Types
// ============================================================

export type AttendanceType = "check-in" | "check-out";
export type DeviceStatus = "online" | "offline" | "error";
export type UserRole = "admin" | "hr" | "viewer";

// ============================================================
// Firestore Document Types
// ============================================================

export interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  email?: string;
  phone?: string;
  position?: string;
  createdAt: string; // ISO string
  updatedAt: string;
  isActive: boolean;
}

export type CreateEmployeeInput = Omit<Employee, "id" | "createdAt" | "updatedAt" | "isActive">;
export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeCode: string; // denormalized for query performance
  employeeName: string; // denormalized for display
  timestamp: string; // ISO string - when punch occurred on device
  type: AttendanceType;
  deviceId: string;
  rawData?: Record<string, unknown>; // raw device payload for audit
  createdAt: string; // when record was created in Firestore
}

export interface Device {
  id: string;
  name: string;
  ipAddress: string;
  port?: number;
  status: DeviceStatus;
  lastSync: string | null; // ISO string
  deviceModel?: string;
  location?: string;
  integrationMode: "api" | "push" | "usb-bridge";
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

// ============================================================
// API Request / Response Types
// ============================================================

export interface ImportAttendancePayload {
  deviceId: string;
  logs: RawAttendanceLog[];
  secret?: string; // for push-based devices
}

export interface RawAttendanceLog {
  employeeCode: string;
  timestamp: string; // ISO or device-native format
  type?: AttendanceType; // some devices don't distinguish
  rawType?: string | number; // raw device value (e.g., 0=in, 1=out)
}

export interface AttendanceFilter {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  deviceId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================
// Dashboard / Report Types
// ============================================================

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendanceRate: number; // percentage
}

export interface DailyReport {
  date: string;
  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  records: AttendanceLog[];
}

export interface MonthlyReportEntry {
  date: string;
  present: number;
  absent: number;
  late: number;
}

// ============================================================
// Device Integration Types
// ============================================================

export interface DeviceAdapter {
  fetchLogs(deviceId: string, since?: Date): Promise<RawAttendanceLog[]>;
  getStatus(deviceId: string): Promise<DeviceStatus>;
  testConnection(device: Device): Promise<boolean>;
}

export interface DeviceAdapterConfig {
  device: Device;
  timeout?: number;
}
