/**
 * USB Bridge Adapter
 * ==================
 * For biometric devices that don't have network APIs.
 * A local script (Node.js / Python) reads from the USB device
 * and POSTs batch logs to our /api/attendance/import endpoint.
 *
 * This adapter acts as a relay — it doesn't communicate with the
 * device directly from the server, but receives data from the bridge.
 *
 * Local bridge script: see /scripts/usb-bridge.ts
 */

import type { Device, DeviceStatus, RawAttendanceLog } from "@/types";
import type { DeviceAdapter } from "./adapter-factory";

export class UsbBridgeAdapter implements DeviceAdapter {
  constructor(private device: Device) {}

  async fetchLogs(): Promise<RawAttendanceLog[]> {
    // USB bridge pushes data to us; nothing to pull here.
    // Logs arrive at POST /api/attendance/import.
    return [];
  }

  async getStatus(): Promise<DeviceStatus> {
    // We can check when the bridge last called us
    // The device record stores `lastSync` — if it's been > 10min, flag as error
    if (!this.device.lastSync) return "offline";

    const lastSyncMs = Date.now() - new Date(this.device.lastSync).getTime();
    const tenMin = 10 * 60 * 1000;

    if (lastSyncMs < tenMin) return "online";
    if (lastSyncMs < 60 * 60 * 1000) return "error"; // 1 hour
    return "offline";
  }
}
