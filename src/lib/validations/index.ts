import { z } from "zod";

// ─── Employee Schemas ─────────────────────────────────────────────────────────
export const CreateEmployeeSchema = z.object({
  name: z.string().min(2).max(100),
  employeeCode: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9-]+$/i, "Employee code must be alphanumeric"),
  department: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{7,15}$/)
    .optional()
    .or(z.literal("")),
  position: z.string().max(100).optional(),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;

// ─── Attendance Schemas ───────────────────────────────────────────────────────
const RawLogSchema = z.object({
  employeeCode: z.string().min(1),
  timestamp: z.string().refine(
    (v) => !isNaN(Date.parse(v)),
    { message: "Invalid timestamp format" }
  ),
  type: z.enum(["check-in", "check-out"]).optional(),
  rawType: z.union([z.string(), z.number()]).optional(),
});

export const ImportAttendanceSchema = z.object({
  deviceId: z.string().min(1),
  logs: z.array(RawLogSchema).min(1).max(1000),
  secret: z.string().optional(),
});

export const AttendanceFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  employeeId: z.string().optional(),
  deviceId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type ImportAttendanceInput = z.infer<typeof ImportAttendanceSchema>;
export type AttendanceFilterInput = z.infer<typeof AttendanceFilterSchema>;

// ─── Device Schemas ───────────────────────────────────────────────────────────
export const CreateDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  ipAddress: z.string().ip({ version: "v4" }).or(z.string().min(7)),
  port: z.number().int().min(1).max(65535).optional(),
  location: z.string().max(200).optional(),
  deviceModel: z.string().max(100).optional(),
  integrationMode: z.enum(["api", "push", "usb-bridge"]).default("api"),
});

export type CreateDeviceInput = z.infer<typeof CreateDeviceSchema>;
