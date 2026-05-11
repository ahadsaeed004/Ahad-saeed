"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/hooks/useAuth";
import { useEmployees } from "@/hooks/useEmployees";
import { apiFetch, formatDateTime, cn, exportToCSV } from "@/lib/utils";
import toast from "react-hot-toast";
import type { AttendanceLog, PaginatedResponse } from "@/types";

const PAGE_SIZE = 50;

export default function AttendancePage() {
  const { token } = useAuth();
  const { employees } = useEmployees();

  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().slice(0, 10);
  
  const [startDate, setStartDate] = useState(sevenDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [employeeId, setEmployeeId] = useState("");

  const fetchLogs = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const { fetchAttendanceLogs } = await import("@/lib/firebase/firestore");
      const result = await fetchAttendanceLogs({
        startDate: startDate ? `${startDate}T00:00:00Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59Z` : undefined,
        employeeId: employeeId || undefined,
        page: pg,
        limit: PAGE_SIZE,
      });
      
      setLogs(result.data);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setPage(pg);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, employeeId]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  function handleExport() {
    exportToCSV(
      logs.map((l) => ({
        Employee: l.employeeName,
        Code: l.employeeCode,
        Type: l.type,
        Timestamp: formatDateTime(l.timestamp),
        Device: l.deviceId,
      })),
      `attendance-${startDate}-to-${endDate}`
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Attendance Logs"
        subtitle={`${total.toLocaleString()} records`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!confirm("Seed demo attendance logs?")) return;
                const { seedDemoData } = await import("@/lib/firebase/seed");
                const res = await seedDemoData();
                if (res.success) {
                  toast.success(res.message || "Seeded successfully");
                  window.location.reload();
                }
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700 transition-colors"
            >
              Seed Data
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 text-slate-300 text-sm rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 animate-fade-in">
        {/* Filters */}
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Employee</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors min-w-40"
              >
                <option value="">All employees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.employeeCode})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => fetchLogs(1)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Device</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No attendance records for this period
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800/60 last:border-0 table-row-hover">
                    <td className="px-4 py-3 font-medium text-slate-200">{log.employeeName}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        {log.employeeCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full border",
                          log.type === "check-in"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        )}
                      >
                        {log.type === "check-in" ? "Check In" : "Check Out"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                      {log.deviceId}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Page {page} · {total.toLocaleString()} total records
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchLogs(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchLogs(page + 1)}
                  disabled={!hasMore}
                  className="px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
