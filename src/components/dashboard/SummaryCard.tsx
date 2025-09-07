import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function SummaryCard({
  title,
  count,
  color,
}: {
  title: string;
  count: number;
  color: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold text-${color}`}>{count}</p>
      </CardContent>
    </Card>
  );
}
