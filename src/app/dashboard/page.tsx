"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { LiveAttendanceFeed } from "@/components/dashboard/LiveAttendanceFeed";
import { useAuth } from "@/hooks/useAuth";
import type { DashboardStats } from "@/types";
import { seedDemoData } from "@/lib/firebase/seed";
import toast from "react-hot-toast";
import { useDashboardStats } from "@/hooks/useDashboardStats";

function AttendanceRing({ percent }: { percent: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="#6371f0"
          strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{percent}%</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { stats, loading } = useDashboardStats();
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    if (!confirm("Are you sure you want to seed demo data? This will add new records to your database.")) return;
    setSeeding(true);
    const result = await seedDemoData();
    setSeeding(false);
    if (result.success) {
      toast.success(result.message || "Demo data synced successfully!");
      // Stats will update automatically via real-time hook, but reload for other tabs
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to seed data");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <Topbar
        title="Dashboard"
        subtitle="Today's attendance overview"
        actions={
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 text-xs font-medium text-white transition-all rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {seeding ? (
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            )}
            {seeding ? "Seeding..." : "Seed Demo Data"}
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-6 gradient-bg animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Employees"
            value={loading ? "—" : (stats?.totalEmployees ?? 0)}
            subtext="Active workforce"
            accentColor="blue"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <StatCard
            label="Present Today"
            value={loading ? "—" : (stats?.presentToday ?? 0)}
            subtext="Checked in"
            accentColor="green"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Absent Today"
            value={loading ? "—" : (stats?.absentToday ?? 0)}
            subtext="Not checked in"
            accentColor="red"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Late Arrivals"
            value={loading ? "—" : (stats?.lateToday ?? 0)}
            subtext="After 9:00 AM"
            accentColor="yellow"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Feed (2/3 width) */}
          <div className="lg:col-span-2 h-96">
            <LiveAttendanceFeed />
          </div>

          {/* Attendance Rate Card (1/3 width) */}
          <div className="glass rounded-xl p-5 flex flex-col">
            <h2 className="text-sm font-semibold text-white mb-1">Attendance Rate</h2>
            <p className="text-xs text-slate-500 mb-6">Today vs total workforce</p>

            <div className="flex-1 flex flex-col items-center justify-center">
              <AttendanceRing percent={loading ? 0 : (stats?.attendanceRate ?? 0)} />
              <p className="text-sm text-slate-400 mt-4 text-center">
                {loading ? "—" : `${stats?.presentToday ?? 0} of ${stats?.totalEmployees ?? 0}`} employees present
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-500" />
                  <span className="text-slate-400">Present</span>
                </div>
                <span className="text-slate-300 font-medium">{stats?.presentToday ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                  <span className="text-slate-400">Absent</span>
                </div>
                <span className="text-slate-300 font-medium">{stats?.absentToday ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-slate-400">Late</span>
                </div>
                <span className="text-slate-300 font-medium">{stats?.lateToday ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
