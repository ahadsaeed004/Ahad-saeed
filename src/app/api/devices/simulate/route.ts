import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/auth-middleware";

/**
 * POST /api/devices/simulate
 * ===========================
 * Simulates a biometric device sending attendance logs.
 * FOR DEVELOPMENT ONLY — disable in production.
 *
 * Usage: POST with { employeeCodes: ["E001","E002"], deviceId: "device_1" }
 * This will generate realistic check-in/out records and POST them to /api/attendance/import.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return errorResponse("Simulator not available in production", 403);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const employeeCodes = (body.employeeCodes as string[]) ?? ["E001", "E002", "E003"];
  const deviceId = (body.deviceId as string) ?? "simulator";
  const count = Math.min((body.count as number) ?? employeeCodes.length, 50);

  // Generate realistic log entries
  const now = new Date();
  const logs = [];

  for (let i = 0; i < count; i++) {
    const code = employeeCodes[i % employeeCodes.length];
    const isCheckIn = i % 2 === 0 || Math.random() > 0.3;

    // Randomize time within today
    const logTime = new Date(now);
    if (isCheckIn) {
      logTime.setHours(8 + Math.floor(Math.random() * 2)); // 8-9 AM
      logTime.setMinutes(Math.floor(Math.random() * 60));
    } else {
      logTime.setHours(17 + Math.floor(Math.random() * 2)); // 5-6 PM
      logTime.setMinutes(Math.floor(Math.random() * 60));
    }

    logs.push({
      employeeCode: code,
      timestamp: logTime.toISOString(),
      type: isCheckIn ? "check-in" : "check-out",
      rawType: isCheckIn ? 0 : 1,
    });
  }

  // Call our own import endpoint
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const importRes = await fetch(`${baseUrl}/api/attendance/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      logs,
      secret: process.env.API_SECRET_KEY,
    }),
  });

  const importData = await importRes.json();

  return successResponse({
    simulated: logs.length,
    importResult: importData,
    logs: logs.slice(0, 5), // preview first 5
  });
}
