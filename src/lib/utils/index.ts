import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, startOfDay, endOfDay, isValid } from "date-fns";

// ─── Tailwind helper ──────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function formatDate(date: string | Date, fmt = "MMM dd, yyyy"): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return isValid(d) ? format(d, fmt) : "—";
  } catch {
    return "—";
  }
}

export function formatTime(date: string | Date): string {
  return formatDate(date, "hh:mm a");
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, "MMM dd, yyyy hh:mm a");
}

export function todayRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: startOfDay(now).toISOString(),
    end: endOfDay(now).toISOString(),
  };
}

// ─── Attendance type helpers ──────────────────────────────────────────────────
export function normalizeAttendanceType(
  type: string | number | undefined
): "check-in" | "check-out" {
  if (type === "check-in" || type === 0 || type === "0" || type === "in") {
    return "check-in";
  }
  if (type === "check-out" || type === 1 || type === "1" || type === "out") {
    return "check-out";
  }
  // Default: infer from time of day
  const hour = new Date().getHours();
  return hour < 13 ? "check-in" : "check-out";
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function formatPercentNum(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── API client helper ────────────────────────────────────────────────────────
export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
  };

  const res = await fetch(path, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Request failed: ${res.status}`);
  }

  return json.data as T;
}
