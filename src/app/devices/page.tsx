"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { fetchDevices, subscribeToDevices } from "@/lib/firebase/firestore";
import { apiFetch, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import type { Device } from "@/types";

export default function DevicesPage() {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToDevices((updatedDevices) => {
      setDevices(updatedDevices);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function handleSyncAll() {
    if (!token) return;
    setSyncing(true);
    try {
      const res = await apiFetch<{ totalImported: number }>("/api/devices/sync", { token });
      toast.success(`Sync complete! Imported ${res.totalImported} logs.`);
    } catch (err) {
      toast.error("Sync failed. Check device connections.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Biometric Devices"
        subtitle={`${devices.length} registered devices`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAll}
              disabled={syncing || devices.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {syncing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {syncing ? "Syncing..." : "Sync All Now"}
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p>Loading devices...</p>
            </div>
          ) : devices.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 glass rounded-2xl">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-600">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-300">No Devices Found</p>
              <p className="text-sm mt-1 max-w-xs text-center">Use the Seeding utility on the Dashboard to add demo devices.</p>
            </div>
          ) : (
            devices.map((device) => (
              <div key={device.id} className="glass rounded-2xl p-5 flex flex-col hover:border-slate-700 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      device.status === 'online' ? 'bg-green-500/10 text-green-400' : 
                      device.status === 'offline' ? 'bg-slate-500/10 text-slate-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors">{device.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">{device.ipAddress}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    device.status === 'online' ? 'bg-green-500/10 text-green-400' : 
                    device.status === 'offline' ? 'bg-slate-500/10 text-slate-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      device.status === 'online' ? 'bg-green-400' : 
                      device.status === 'offline' ? 'bg-slate-400' : 'bg-red-400'
                    }`} />
                    {device.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-800/60 my-2">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Model</p>
                    <p className="text-sm text-slate-300 truncate">{device.deviceModel || "Standard"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Location</p>
                    <p className="text-sm text-slate-300 truncate">{device.location || "Default"}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500">Last Sync</span>
                    <span className="text-slate-300 font-mono">{device.lastSync ? formatDate(device.lastSync, "MMM dd, hh:mm a") : "Never"}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-slate-500">Integration</span>
                    <span className="text-brand-400 font-medium capitalize">{device.integrationMode}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
