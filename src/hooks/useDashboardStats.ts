"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
} from "firebase/firestore";
import { getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import type { DashboardStats, Employee, AttendanceLog } from "@/types";

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);

  // Calculate stats whenever employees or logs change
  const calculateStats = useCallback(() => {
    const totalEmployees = employees.length;
    
    const checkedInIds = new Set();
    const lateIds = new Set();
    
    // Set threshold to 9:00 AM today
    const lateThreshold = new Date();
    lateThreshold.setHours(9, 0, 0, 0);

    logs.forEach(log => {
      if (log.type === "check-in") {
        checkedInIds.add(log.employeeId);
        // Compare log timestamp with threshold
        if (new Date(log.timestamp) > lateThreshold) {
          lateIds.add(log.employeeId);
        }
      }
    });

    const presentToday = checkedInIds.size;
    const lateToday = lateIds.size;
    const absentToday = Math.max(0, totalEmployees - presentToday);
    const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    setStats({
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      attendanceRate
    });
  }, [employees, logs]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  useEffect(() => {
    // 1. Subscribe to Active Employees
    const employeesQuery = query(
      collection(getClientDb(), COLLECTIONS.EMPLOYEES),
      where("isActive", "==", true)
    );

    // 2. Subscribe to Today's Logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    const logsQuery = query(
      collection(getClientDb(), COLLECTIONS.ATTENDANCE_LOGS),
      where("timestamp", ">=", todayStr)
    );

    const unsubEmployees = onSnapshot(employeesQuery, (snap) => {
      const emps = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          employeeCode: d.employeeCode,
          department: d.department,
          email: d.email,
          phone: d.phone,
          position: d.position,
          isActive: d.isActive ?? true,
          createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
          updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        } as Employee;
      });
      setEmployees(emps);
    });

    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      const lgs = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          employeeId: d.employeeId,
          employeeCode: d.employeeCode,
          employeeName: d.employeeName,
          timestamp: d.timestamp?.toDate?.()?.toISOString?.() ?? d.timestamp ?? new Date().toISOString(),
          type: d.type,
          deviceId: d.deviceId,
          rawData: d.rawData,
          createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        } as AttendanceLog;
      });
      setLogs(lgs);
      setLoading(false);
    });

    return () => {
      unsubEmployees();
      unsubLogs();
    };
  }, []);

  return { stats, loading };
}
