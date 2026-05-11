"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch, exportToCSV, formatDate } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import toast from "react-hot-toast";
import type { DailyReport, MonthlyReportEntry } from "@/types";

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg p-3 text-xs border border-slate-700">
      <p className="text-slate-300 font-medium mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400 capitalize">{p.name}:</span>
          <span className="text-white font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildMonthlyData(year: number, month: number): MonthlyReportEntry[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month - 1, i + 1);
    return {
      date: d.toISOString().slice(0, 10),
      present: 0,
      absent: 0,
      late: 0,
    };
  });
}

export default function ReportsPage() {
  const { token } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [chartData, setChartData] = useState<MonthlyReportEntry[]>([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}T23:59:59.999Z`;

      const { fetchAttendanceLogs } = await import("@/lib/firebase/firestore");
      const result = await fetchAttendanceLogs({
        startDate: startDate,
        endDate: endDate,
        limit: 2000,
      });

      // Build daily aggregation from raw logs
      const days = buildMonthlyData(year, month);
      const dayMap = new Map(days.map((d) => [d.date, d]));
      const lateHour = 9;

      // Track unique check-ins per employee per day
      const checkins = new Map<string, Set<string>>(); // date -> Set<employeeId>
      const lates = new Map<string, Set<string>>();

      for (const log of result.data) {
        if (log.type !== "check-in") continue;
        const date = log.timestamp.slice(0, 10);
        const hour = new Date(log.timestamp).getHours();

        if (!checkins.has(date)) checkins.set(date, new Set());
        checkins.get(date)!.add(log.employeeId);

        if (hour >= lateHour) {
          if (!lates.has(date)) lates.set(date, new Set());
          lates.get(date)!.add(log.employeeId);
        }
      }

      // Get total employees for absent calculation
      let totalEmployees = 0;
      try {
        const { getDocs, collection, query, where } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase/client");
        const empSnap = await getDocs(query(collection(db, "employees"), where("isActive", "==", true)));
        totalEmployees = empSnap.size;
      } catch { /* ignore */ }

      let totalPresent = 0;
      let totalAbsent = 0;
      let totalLate = 0;

      dayMap.forEach((day, date) => {
        const present = checkins.get(date)?.size ?? 0;
        const late = lates.get(date)?.size ?? 0;
        const absent = Math.max(0, totalEmployees - present);
        day.present = present;
        day.late = late;
        day.absent = absent;
        totalPresent += present;
        totalAbsent += absent;
        totalLate += late;
      });

      setChartData(days.map((d) => ({
        ...d,
        date: formatDate(d.date, "dd"),
      })));

      setSummary({
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        total: result.data.length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, year, month]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  async function handleExport() {
    if (!token) return;
    try {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}T23:59:59.999Z`;

      const result = await apiFetch<{ data: Array<Record<string, unknown>> }>(
        `/api/attendance?startDate=${startDate}&endDate=${endDate}&limit=2000`,
        { token }
      );

      exportToCSV(
        result.data.map((l) => ({
          Employee: l.employeeName,
          Code: l.employeeCode,
          Type: l.type,
          Timestamp: l.timestamp,
          Device: l.deviceId,
        })),
        `report-${year}-${String(month).padStart(2, "0")}`
      );
    } catch (err) {
      console.error(err);
    }
  }

  const MONTHS = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Reports"
        subtitle="Monthly attendance analytics"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!confirm("Seed demo attendance data?")) return;
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

      <div className="flex-1 p-6 space-y-6 animate-fade-in">
        {/* Period Selector */}
        <div className="glass rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            >
              {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="self-end">
            <button
              onClick={fetchReport}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Load Report
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Punches", value: summary.total, color: "text-white" },
            { label: "Check-ins", value: summary.present, color: "text-green-400" },
            { label: "Absent Days", value: summary.absent, color: "text-red-400" },
            { label: "Late Arrivals", value: summary.late, color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>
                {loading ? "—" : s.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-1">
            Daily Attendance — {MONTHS[month - 1]} {year}
          </h2>
          <p className="text-xs text-slate-500 mb-5">Present vs absent per day</p>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barSize={10} barGap={2}>
                <CartesianGrid vertical={false} stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,113,240,0.05)" }} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="present" name="Present" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
