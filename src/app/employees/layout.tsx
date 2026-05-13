export const dynamic = "force-dynamic";

import DashboardLayout from "@/app/dashboard/layout";

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
