import { NextRequest } from "next/server";
import { syncAllDevices } from "@/lib/device-integration/sync-service";
import { successResponse, errorResponse } from "@/lib/utils/auth-middleware";

/**
 * GET /api/devices/sync
 * Triggers a full sync of all API-mode devices.
 * Called by:
 *   - Vercel cron (vercel.json: cron job every N minutes)
 *   - Manual admin dashboard "Sync Now" button
 *
 * Auth: CRON_SECRET header OR admin Bearer token
 */
export async function GET(request: NextRequest) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Fall back to checking for admin token
    // (allow manual triggers from dashboard)
    const { verifyAuthToken } = await import("@/lib/utils/auth-middleware");
    try {
      await verifyAuthToken(request);
    } catch {
      return errorResponse("Unauthorized", 401);
    }
  }

  try {
    console.log("[DeviceSync] Starting sync for all API-mode devices...");
    const results = await syncAllDevices();

    const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const hasErrors = results.some((r) => r.errors.length > 0);

    console.log(
      `[DeviceSync] Done. Imported: ${totalImported}, Skipped: ${totalSkipped}, Errors: ${hasErrors}`
    );

    return successResponse({ results, totalImported, totalSkipped });
  } catch (err) {
    console.error("[DeviceSync] Fatal error:", err);
    return errorResponse("Sync failed", 500);
  }
}
