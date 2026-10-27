import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ParentDashboard } from "@/components/dashboard/ParentDashboard";
import { PageLoader } from "@/components/PageLoader";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/parent-dashboard")({
  head: () => ({
    meta: [
      { title: "Parent Dashboard — Akira School ERP" },
      { name: "description", content: "Your child's attendance, fees and school updates." },
    ],
  }),
  component: ParentDashboardPage,
});

function ParentDashboardPage() {
  const { user, loading } = useCurrentUser();

  if (loading) return <PageLoader />;
  // Only parents belong here; everyone else uses the regular dashboard.
  if (user && user.roleCode !== "PARENT") return <Navigate to="/dashboard" replace />;

  return <ParentDashboard />;
}
