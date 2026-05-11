import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { AttendanceFilterSchema } from "@/lib/validations";
import {
  withAuth,
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/utils/auth-middleware";

/**
 * GET /api/attendance
 * Query params: startDate, endDate, employeeId, deviceId, page, limit
 * Auth: Bearer token required
 */
export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());

  const parsed = AttendanceFilterSchema.safeParse(rawParams);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten());
  }

  const { startDate, endDate, employeeId, deviceId, page, limit } =
    parsed.data;
  const db = getAdminDb();

  try {
    let q = db
      .collection("attendance_logs")
      .orderBy("timestamp", "desc") as FirebaseFirestore.Query;

    if (startDate) {
      q = q.where("timestamp", ">=", new Date(startDate).toISOString());
    }
    if (endDate) {
      q = q.where("timestamp", "<=", new Date(endDate).toISOString());
    }
    if (employeeId) {
      q = q.where("employeeId", "==", employeeId);
    }
    if (deviceId) {
      q = q.where("deviceId", "==", deviceId);
    }

    // Pagination: offset-based (simple) for admin dashboard
    const offset = (page - 1) * limit;
    const snap = await q.offset(offset).limit(limit + 1).get();

    const docs = snap.docs.slice(0, limit);
    const hasMore = snap.docs.length > limit;

    // Get total count (approximate — Firestore doesn't support cheap COUNT with filters)
    const countSnap = await q.count().get();
    const total = countSnap.data().count;

    const data = docs.map((d) => ({ id: d.id, ...d.data() }));

    return successResponse({
      data,
      total,
      page,
      limit,
      hasMore,
    });
  } catch (err) {
    console.error("[GET /api/attendance] Error:", err);
    return errorResponse("Failed to fetch attendance logs", 500);
  }
});
