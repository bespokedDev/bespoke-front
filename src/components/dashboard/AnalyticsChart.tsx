import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function AnalyticsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolución de Inscripciones</CardTitle>
      </CardHeader>
      <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
        [Gráfica de inscripciones (mock)]
      </CardContent>
    </Card>
  );
}
