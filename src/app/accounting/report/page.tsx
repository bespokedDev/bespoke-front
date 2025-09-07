/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, Plus, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";

// CORRECCIÓN: La interfaz ahora coincide con los datos reales de la API.
interface SavedReportSummary {
  _id: string;
  month: string;
}

export default function ReportHistoryPage() {
  const [reports, setReports] = useState<SavedReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );

  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient("api/general-payment-tracker");
        console.log("data", data);
        setReports(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch report history.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleNavigateToNewReport = () => {
    if (!selectedMonth) {
      alert("Please select a month.");
      return;
    }
    router.push(`/accounting/report/new?month=${selectedMonth}`);
  };

  const stringLocaleSort =
    (locale = "es") =>
    (rowA: any, rowB: any, columnId: string) => {
      const a = (rowA.getValue(columnId) ?? "").toString();
      const b = (rowB.getValue(columnId) ?? "").toString();
      return a.localeCompare(b, locale, {
        numeric: true,
        sensitivity: "base",
        ignorePunctuation: true,
      });
    };

  // CORRECCIÓN: Las columnas ahora son más simples y reflejan los datos disponibles.
  const columns: ColumnDef<SavedReportSummary>[] = [
    {
      accessorKey: "month",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Report Month
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => row.original.month,
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button asChild variant="outline" size="sm">
          {/* El ID se usa aquí para navegar al reporte correcto */}
          <Link href={`/accounting/report/history/${row.original._id}`}>
            <Eye className="h-4 w-4 mr-2" /> View Report
          </Link>
        </Button>
      ),
    },
  ];

  if (isLoading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  if (error) return <p className="text-destructive text-center">{error}</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting Reports"
        subtitle="View history or create a new monthly report."
      >
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Report
        </Button>
      </PageHeader>
      <DataTable columns={columns} data={reports} searchKeys={[]} />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Report</DialogTitle>
          </DialogHeader>
          <DialogDescription className="py-4">
            <Label className="pb-2" htmlFor="month-select">Select Report Month</Label>
            <Input
              id="month-select"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleNavigateToNewReport}>Generate Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
