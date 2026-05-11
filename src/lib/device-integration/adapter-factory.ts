/**
 * Device Integration Layer
 * ========================
 * Modular adapter pattern. Each device brand/model implements DeviceAdapter.
 * The factory returns the correct adapter based on device config.
 *
 * Supported modes:
 *   - "api"        → Device exposes an HTTP endpoint; we poll it
 *   - "push"       → Device / local bridge POSTs to our /api/attendance/import
 *   - "usb-bridge" → A local script reads the device and POSTs to our API
 *
 * Adding a new device brand: create a new file in this folder,
 * implement DeviceAdapter, and register it in the factory below.
 */

import type { Device, DeviceStatus, RawAttendanceLog } from "@/types";

// ─── Adapter Interface ────────────────────────────────────────────────────────
export interface DeviceAdapter {
  /**
   * Fetch attendance logs from the device.
   * @param since - Only return logs newer than this date (for incremental sync)
   */
  fetchLogs(since?: Date): Promise<RawAttendanceLog[]>;

  /**
   * Check whether the device is reachable.
   */
  getStatus(): Promise<DeviceStatus>;

  /**
   * Optional: test a new connection before saving.
   */
  testConnection?(): Promise<{ success: boolean; message: string }>;
}

// ─── Factory ──────────────────────────────────────────────────────────────────
export async function createDeviceAdapter(
  device: Device
): Promise<DeviceAdapter> {
  switch (device.integrationMode) {
    case "api":
      const { ZKTecoAdapter } = await import("./zkteco-adapter");
      return new ZKTecoAdapter(device);

    case "push":
      // Push mode: device sends data to us — no adapter needed for fetching
      return new PushModeAdapter(device);

    case "usb-bridge":
      const { UsbBridgeAdapter } = await import("./usb-bridge-adapter");
      return new UsbBridgeAdapter(device);

    default:
      throw new Error(`Unknown integration mode: ${device.integrationMode}`);
  }
}

// ─── Push Mode Stub ───────────────────────────────────────────────────────────
/**
 * For devices that push data to us, there's nothing to fetch.
 * This adapter only implements getStatus() via a ping.
 */
class PushModeAdapter implements DeviceAdapter {
  constructor(private device: Device) {}

  async fetchLogs(): Promise<RawAttendanceLog[]> {
    // Push mode: data arrives at /api/attendance/import
    // Returning empty array is correct — no polling needed
    return [];
  }

  async getStatus(): Promise<DeviceStatus> {
    try {
      const url = `http://${this.device.ipAddress}:${this.device.port ?? 80}/`;
      const res = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      return res.ok ? "online" : "error";
    } catch {
      return "offline";
    }
  }
}
