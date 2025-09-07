import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function AssignmentsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimas Asignaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Estudiante</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Profesor</th>
              <th className="px-4 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="px-4 py-2">Ana P.</td>
              <td className="px-4 py-2">Inglés B1</td>
              <td className="px-4 py-2">Luis M.</td>
              <td className="px-4 py-2">2025-05-25</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2">Carlos R.</td>
              <td className="px-4 py-2">Francés A2</td>
              <td className="px-4 py-2">Sofía G.</td>
              <td className="px-4 py-2">2025-05-24</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
