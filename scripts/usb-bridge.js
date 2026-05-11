#!/usr/bin/env node
/**
 * USB Bridge Script
 * =================
 * Runs locally on the machine physically connected to the biometric device.
 * Reads attendance data via USB/serial and POSTs it to the AttendSync API.
 *
 * Supported libraries:
 *   - node-zklib (ZKTeco via USB/TCP)
 *   - serialport (for generic RS-232 devices)
 *
 * Usage:
 *   API_URL=https://your-app.vercel.app \
 *   API_SECRET=your_secret \
 *   DEVICE_IP=192.168.1.100 \
 *   DEVICE_ID=device_firestore_id \
 *   node scripts/usb-bridge.js
 *
 * Install deps: npm install node-zklib node-cron axios
 */

const cron = require("node-cron");
const axios = require("axios");

const CONFIG = {
  apiUrl: process.env.API_URL ?? "http://localhost:3000",
  apiSecret: process.env.API_SECRET ?? "",
  deviceIp: process.env.DEVICE_IP ?? "192.168.1.100",
  devicePort: parseInt(process.env.DEVICE_PORT ?? "4370"), // ZKTeco default port
  deviceId: process.env.DEVICE_ID ?? "device_1",
  pollInterval: process.env.POLL_INTERVAL ?? "*/2 * * * *", // every 2 minutes
};

let lastSyncTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Start: 24h ago

async function fetchFromDevice() {
  // ── Option 1: node-zklib (ZKTeco devices) ──────────────────────────────
  // const ZKLib = require('node-zklib');
  // const zk = new ZKLib(CONFIG.deviceIp, CONFIG.devicePort, 5200, 200);
  // try {
  //   await zk.createSocket();
  //   const { data } = await zk.getAttendances();
  //   await zk.disconnect();
  //   return data
  //     .filter(r => new Date(r.recordTime) > lastSyncTime)
  //     .map(r => ({
  //       employeeCode: r.deviceUserId,
  //       timestamp: new Date(r.recordTime).toISOString(),
  //       rawType: r.type,
  //     }));
  // } catch (err) {
  //   console.error('[Bridge] ZKLib error:', err.message);
  //   return [];
  // }

  // ── Option 2: Mock data for testing ────────────────────────────────────
  console.log(`[Bridge] Fetching from device ${CONFIG.deviceIp}...`);
  
  // In production, replace this with actual device SDK calls
  const mockLogs = [
    {
      employeeCode: "E001",
      timestamp: new Date().toISOString(),
      rawType: 0,
    },
  ];

  return mockLogs.filter(
    (l) => new Date(l.timestamp) > lastSyncTime
  );
}

async function syncToApi(logs) {
  if (logs.length === 0) {
    console.log("[Bridge] No new logs to sync.");
    return;
  }

  console.log(`[Bridge] Syncing ${logs.length} logs to API...`);

  try {
    const response = await axios.post(
      `${CONFIG.apiUrl}/api/attendance/import`,
      {
        deviceId: CONFIG.deviceId,
        logs,
        secret: CONFIG.apiSecret,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      }
    );

    const { imported, skipped } = response.data.data;
    console.log(`[Bridge] ✓ Imported: ${imported}, Skipped: ${skipped}`);
    lastSyncTime = new Date();
  } catch (err) {
    console.error("[Bridge] API error:", err.response?.data ?? err.message);
  }
}

async function runSync() {
  try {
    const logs = await fetchFromDevice();
    await syncToApi(logs);
  } catch (err) {
    console.error("[Bridge] Sync failed:", err.message);
  }
}

// ── Start ─────────────────────────────────────────────────────────────────
console.log(`[Bridge] Starting USB Bridge`);
console.log(`[Bridge] Device: ${CONFIG.deviceIp}:${CONFIG.devicePort}`);
console.log(`[Bridge] API: ${CONFIG.apiUrl}`);
console.log(`[Bridge] Poll: ${CONFIG.pollInterval}\n`);

// Run immediately on start
runSync();

// Schedule recurring sync
cron.schedule(CONFIG.pollInterval, runSync);
