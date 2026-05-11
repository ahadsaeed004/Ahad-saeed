"use client";

import { useState, useEffect, useCallback } from "react";
import { subscribeToEmployees } from "@/lib/firebase/firestore";
import { useAuth } from "./useAuth";
import { apiFetch } from "@/lib/utils";
import type { Employee, CreateEmployeeInput } from "@/types";

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToEmployees((data) => {
      setEmployees(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const createEmployee = useCallback(
    async (data: CreateEmployeeInput): Promise<Employee> => {
      if (!token) throw new Error("Not authenticated");
      return apiFetch<Employee>("/api/employees", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      });
    },
    [token]
  );

  const updateEmployee = useCallback(
    async (id: string, data: Partial<CreateEmployeeInput>): Promise<Employee> => {
      if (!token) throw new Error("Not authenticated");
      return apiFetch<Employee>(`/api/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      });
    },
    [token]
  );

  const deleteEmployee = useCallback(
    async (id: string): Promise<void> => {
      if (!token) throw new Error("Not authenticated");
      await apiFetch(`/api/employees/${id}`, { method: "DELETE", token });
    },
    [token]
  );

  return {
    employees,
    loading,
    error,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  };
}
