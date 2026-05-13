"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useEmployees } from "@/hooks/useEmployees";
import { cn, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Employee } from "@/types";

// ─── Employee Form Modal ──────────────────────────────────────────────────────
interface EmployeeFormProps {
  employee?: Employee | null;
  onClose: () => void;
  onSave: (data: Partial<Employee>) => Promise<void>;
}

function EmployeeModal({ employee, onClose, onSave }: EmployeeFormProps) {
  const isEdit = !!employee;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: employee?.name ?? "",
    employeeCode: employee?.employeeCode ?? "",
    department: employee?.department ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    position: employee?.position ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      toast.success(isEdit ? "Employee updated" : "Employee created");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass rounded-2xl p-6 animate-slide-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? "Edit Employee" : "Add Employee"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {[
            { key: "name", label: "Full Name", required: true, placeholder: "John Doe" },
            { key: "employeeCode", label: "Employee Code", required: true, placeholder: "E001", disabled: isEdit },
            { key: "department", label: "Department", required: true, placeholder: "Engineering" },
            { key: "position", label: "Position", placeholder: "Software Engineer" },
            { key: "email", label: "Email", type: "email", placeholder: "john@company.com" },
            { key: "phone", label: "Phone", placeholder: "+92 300 1234567" },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {field.label} {field.required && <span className="text-red-400">*</span>}
              </label>
              <input
                type={field.type ?? "text"}
                value={form[field.key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                required={field.required}
                disabled={field.disabled}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              />
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isEdit ? "Save Changes" : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const { employees, loading, createEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const [modal, setModal] = useState<"create" | Employee | null>(null);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave(data: Partial<Employee>) {
    if (modal === "create") {
      await createEmployee(data as Parameters<typeof createEmployee>[0]);
    } else if (modal && typeof modal === "object") {
      await updateEmployee(modal.id, data);
    }
  }

  async function handleDelete(employee: Employee) {
    if (!confirm(`Delete ${employee.name}? This will soft-delete the record.`)) return;
    setDeleting(employee.id);
    try {
      await deleteEmployee(employee.id);
      toast.success("Employee deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Employees"
        subtitle={`${employees.length} active employees`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!confirm("Seed demo employees?")) return;
                const { seedDemoData } = await import("@/lib/firebase/seed");
                const res = await seedDemoData();
                if (res.success) {
                  toast.success(res.message || "Seeded successfully");
                  window.location.reload();
                } else {
                  toast.error(res.error || "Failed");
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors border border-slate-700"
            >
              Seed Demo
            </button>
            <button
              onClick={() => setModal("create")}
              className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Employee
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 animate-fade-in">
        {/* Search */}
        <div className="mb-4 relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, department..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Table */}
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Position</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden xl:table-cell">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      Loading employees...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No employees found
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-800/60 last:border-0 table-row-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-brand-400">
                            {emp.name[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">{emp.name}</p>
                          {emp.email && <p className="text-xs text-slate-500">{emp.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        {emp.employeeCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{emp.department}</td>
                    <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{emp.position ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden xl:table-cell">
                      {formatDate(emp.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setModal(emp)}
                          className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(emp)}
                          disabled={deleting === emp.id}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-40"
                        >
                          {deleting === emp.id ? (
                            <div className="w-4 h-4 border border-red-400/50 border-t-red-400 rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <EmployeeModal
          employee={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
