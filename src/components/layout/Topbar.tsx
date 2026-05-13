"use client";

import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";

import Image from "next/image";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const { user } = useAuth();
  const now = new Date();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-white leading-none">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {actions && <div className="flex items-center gap-2">{actions}</div>}

          {/* Date */}
          <span className="text-sm text-slate-500 hidden sm:block">
            {formatDate(now, "EEEE, MMM dd")}
          </span>

          {/* User avatar */}
          {user && (
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName ?? "User"}
                  width={28}
                  height={28}
                  unoptimized
                  className="rounded-full border border-slate-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
                  <span className="text-xs font-medium text-brand-400">
                    {(user.displayName ?? user.email ?? "A")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm text-slate-300 hidden lg:block">
                {user.displayName ?? user.email?.split("@")[0]}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
