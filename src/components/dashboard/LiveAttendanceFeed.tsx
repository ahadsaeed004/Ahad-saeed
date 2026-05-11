"use client";

import { useLiveAttendance } from "@/hooks/useLiveAttendance";
import { formatTime, cn } from "@/lib/utils";
import type { AttendanceLog } from "@/types";
import { seedDemoData } from "@/lib/firebase/seed";
import { useState } from "react";
import toast from "react-hot-toast";

function LogRow({ log }: { log: AttendanceLog }) {
  const isCheckIn = log.type === "check-in";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-800/60 last:border-0 animate-slide-in table-row-hover px-1 rounded">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-medium text-slate-300">
          {log.employeeName.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">
          {log.employeeName}
        </p>
        <p className="text-xs text-slate-500 font-mono">{log.employeeCode}</p>
      </div>

      {/* Type badge */}
      <span
        className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0",
          isCheckIn
            ? "bg-green-500/10 text-green-400 border-green-500/20"
            : "bg-orange-500/10 text-orange-400 border-orange-500/20"
        )}
      >
        {isCheckIn ? "In" : "Out"}
      </span>

      {/* Time */}
      <span className="text-xs text-slate-500 flex-shrink-0 w-16 text-right font-mono">
        {formatTime(log.timestamp)}
      </span>
    </div>
  );
}

export function LiveAttendanceFeed() {
  const { logs, loading } = useLiveAttendance();
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    const result = await seedDemoData();
    setSeeding(false);
    if (result.success) {
      toast.success(result.message || "Seeded successfully");
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to seed data");
    }
  };

  return (
    <div className="glass rounded-xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Live Feed</h2>
          <p className="text-xs text-slate-500 mt-0.5">Today&apos;s activity</p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 mb-4">No activity yet today</p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="text-xs font-medium text-brand-400 hover:text-brand-300 underline underline-offset-4 flex items-center gap-2"
          >
            {seeding ? "Seeding..." : "Generate Demo Activity"}
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-0 -mx-1 px-1">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </div>
      )}

      <div className="pt-3 border-t border-slate-800 mt-3">
        <p className="text-xs text-slate-600 text-center">
          {logs.length} records · Updates automatically
        </p>
      </div>
    </div>
  );
}
