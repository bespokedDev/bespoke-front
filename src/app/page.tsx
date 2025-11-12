import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { AssignmentsTable } from "@/components/dashboard/AssignmentsTable";
import { PageHeader } from "@/components/ui/page-header";

export default function HomePage() {
  const summary = [
    { title: "Estudiantes", count: 120, color: "secondary" },
    { title: "Profesores", count: 25, color: "primary" },
    { title: "Planes Activos", count: 8, color: "accent-2" },
    { title: "Asignaciones Hoy", count: 15, color: "accent-1" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard"/>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((item) => (
          <SummaryCard
            key={item.title}
            title={item.title}
            count={item.count}
            color={item.color}
          />
        ))}
      </div>

      <AnalyticsChart />

      <AssignmentsTable />
    </div>
  );
}
