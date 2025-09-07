import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function PlanDistributionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución por Plan</CardTitle>
      </CardHeader>
      <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
        [Gráfica de distribución de planes (mock)]
      </CardContent>
    </Card>
  );
}
