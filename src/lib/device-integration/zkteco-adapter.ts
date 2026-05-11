/**
 * ZKTeco Device Adapter
 * =====================
 * Handles communication with ZKTeco biometric attendance machines
 * that expose an HTTP/HTTPS API (common in ZKTeco SDK-enabled models).
 *
 * Compatible models: ZK9500, ZK4500, SpeedFace series, etc.
 * Authentication: device access code (configured on machine)
 *
 * ZKTeco API reference: https://www.zkteco.com/en/product_detail/id/55.html
 */

import type { Device, DeviceStatus, RawAttendanceLog } from "@/types";
import { normalizeAttendanceType } from "@/lib/utils";
import type { DeviceAdapter } from "./adapter-factory";

interface ZKTecoAttLog {
  UserID: string;
  LogTime: string;
  inOutType: number; // 0=check-in, 1=check-out, 4=overtime-in, 5=overtime-out
  VerifyType?: number;
  WorkCode?: number;
}

interface ZKTecoApiResponse {
  Code: number;
  Message: string;
  Data?: {
    data?: ZKTecoAttLog[];
    last_id?: string;
  };
}

export class ZKTecoAdapter implements DeviceAdapter {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout = parseInt(process.env.DEVICE_API_TIMEOUT_MS ?? "10000");

  constructor(private device: Device) {
    const port = device.port ?? 80;
    this.baseUrl = `http://${device.ipAddress}:${port}`;
    this.headers = {
      "Content-Type": "application/json",
      // ZKTeco uses session-based auth; in production you'd store a session token
    };
  }

  async fetchLogs(since?: Date): Promise<RawAttendanceLog[]> {
    try {
      const params = new URLSearchParams({
        Limit: "500",
        ...(since
          ? { StartTime: since.toISOString().slice(0, 19).replace("T", " ") }
          : {}),
      });

      const res = await fetch(
        `${this.baseUrl}/iclock/data/attendance?${params}`,
        {
          headers: this.headers,
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!res.ok) {
        throw new Error(`ZKTeco API error: ${res.status}`);
      }

      const json: ZKTecoApiResponse = await res.json();

      if (json.Code !== 0) {
        throw new Error(`ZKTeco error: ${json.Message}`);
      }

      return (json.Data?.data ?? []).map((log) => this.normalizeLog(log));
    } catch (error) {
      console.error(`[ZKTecoAdapter] fetchLogs failed for ${this.device.name}:`, error);
      throw error;
    }
  }

  async getStatus(): Promise<DeviceStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/iclock/ping`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok ? "online" : "error";
    } catch {
      return "offline";
    }
  }

  async testConnection() {
    try {
      const status = await this.getStatus();
      return {
        success: status === "online",
        message:
          status === "online"
            ? "Device reachable"
            : "Device unreachable — check IP and port",
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Connection failed",
      };
    }
  }

  private normalizeLog(raw: ZKTecoAttLog): RawAttendanceLog {
    return {
      employeeCode: raw.UserID,
      timestamp: new Date(raw.LogTime).toISOString(),
      type: normalizeAttendanceType(raw.inOutType),
      rawType: raw.inOutType,
    };
  }
}
