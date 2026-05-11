import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { withAuth, successResponse, errorResponse } from "@/lib/utils/auth-middleware";
import type { DashboardStats } from "@/types";

/**
 * GET /api/dashboard/stats
 * Returns today's attendance summary.
 */
export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const db = getAdminDb();
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Run queries in parallel
    const [employeesSnap, todayLogsSnap] = await Promise.all([
      db.collection("employees").where("isActive", "==", true).count().get(),
      db
        .collection("attendance_logs")
        .where("timestamp", ">=", todayStart.toISOString())
        .where("timestamp", "<=", todayEnd.toISOString())
        .get(),
    ]);

    const totalEmployees = employeesSnap.data().count;

    // Find unique employees who checked in today
    const checkedInIds = new Set<string>();
    todayLogsSnap.docs.forEach((d) => {
      if (d.data().type === "check-in") {
        checkedInIds.add(d.data().employeeId);
      }
    });

    const presentToday = checkedInIds.size;
    const absentToday = Math.max(0, totalEmployees - presentToday);

    // "Late" = checked in after 9:00 AM (configurable)
    const lateThreshold = new Date(now);
    lateThreshold.setHours(9, 0, 0, 0);

    const lateIds = new Set<string>();
    todayLogsSnap.docs.forEach((d) => {
      const data = d.data();
      if (
        data.type === "check-in" &&
        new Date(data.timestamp) > lateThreshold
      ) {
        lateIds.add(data.employeeId);
      }
    });

    const lateToday = lateIds.size;
    const attendanceRate =
      totalEmployees > 0
        ? Math.round((presentToday / totalEmployees) * 100)
        : 0;

    const stats: DashboardStats = {
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      attendanceRate,
    };

    return successResponse(stats);
  } catch (err) {
    console.error("[GET /api/dashboard/stats]", err);
    return errorResponse("Failed to fetch dashboard stats", 500);
  }
});
