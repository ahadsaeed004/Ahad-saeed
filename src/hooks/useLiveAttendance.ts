"use client";

import { useState, useEffect } from "react";
import { subscribeToTodayAttendance } from "@/lib/firebase/firestore";
import type { AttendanceLog } from "@/types";

export function useLiveAttendance() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToTodayAttendance((newLogs) => {
      setLogs(newLogs);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { logs, loading, error };
}
