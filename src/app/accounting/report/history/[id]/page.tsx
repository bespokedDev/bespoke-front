/* eslint-disable @typescript-eslint/no-explicit-any */ "use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Loader2, FileDown, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- DEFINICIONES DE TIPOS ---
interface ReportDetail {
  enrollmentId: string | null;
  period: string;
  plan: string;
  studentName: string;
  amount: number;
  totalHours: number;
  pricePerHour: number;
  pPerHour: number;
  hoursSeen: number;
  balance: number;
  totalTeacher: number;
  totalBespoke: number;
  balanceRemaining: number;
  status: 1 | 2;
}

interface ProfessorReport {
  professorId: string;
  professorName: string;
  details: ReportDetail[];
  subtotals: {
    totalTeacher: number;
    totalBespoke: number;
    balanceRemaining: number;
  };
}

interface SpecialReportDetail {
  enrollmentId: string;
  period: string;
  plan: string;
  studentName: string;
  amount: number;
  totalHours: number;
  hoursSeen: number;
  oldBalance: number;
  payment: number;
  total: number;
  balanceRemaining: number;
}

interface SpecialProfessorReport {
  professorId: string;
  professorName: string;
  details: SpecialReportDetail[];
  subtotal: {
    total: number;
    balanceRemaining: number;
  };
}

interface ExcedentRow {
  studentName: string;
  amount: number;
  hoursSeen: number;
  pricePerHour: number;
  total: number;
  notes: string;
}

interface SavedReport {
  _id: string;
  month: string;
  report: ProfessorReport[]; // El arreglo de profesores generales
  specialProfessorReport: SpecialProfessorReport | null;
  excedents: { rows: ExcedentRow[]; total: number };
  summary: { systemTotal: number; realTotal: number; difference: number };
  date_report: string;
}

export default function ViewReportPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<SavedReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;
    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient(`api/general-payment-tracker/${reportId}`);
        // MODIFICACIÓN: Se establece el estado con el objeto anidado 'data.report'
        setReport(data.report);
      } catch (err: any) {
        setError(err.message || "Failed to fetch report details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [reportId]);

  const handleGeneratePdf = () => {
    if (!report) {
      alert("No hay datos de reporte para generar el PDF.");
      return;
    }

    setIsPrinting(true);

    try {
      const doc = new jsPDF({
        orientation: "landscape",
      });
      let finalY = 15;

      doc.setFontSize(18);
      doc.text(
        `Accounting Report - ${format(
          new Date(report.month + "-02"),
          "MMMM yyyy"
        )}`,
        14,
        finalY
      );
      finalY += 10;

      // --- Tablas de Profesores Generales ---
      report.report.forEach((prof) => {
        if (finalY > 20) finalY += 5;
        doc.setFontSize(11);
        doc.text(prof.professorName, 14, finalY);
        finalY += 3;

        autoTable(doc, {
          startY: finalY,
          head: [
            [
              "Period",
              "Plan",
              "Student",
              "Amount",
              "Total Hrs",
              "Price/Hr",
              "Hrs Seen",
              "Pay/Hr",
              "Balance",
              "T. Teacher",
              "T. Bespoke",
              "Bal. Rem.",
            ],
          ],
          body: prof.details.map((d) => [
            d.period,
            d.plan,
            d.studentName,
            `$${d.amount.toFixed(2)}`,
            d.totalHours,
            `$${d.pricePerHour.toFixed(2)}`,
            d.hoursSeen,
            `$${d.pPerHour.toFixed(2)}`,
            `$${d.balance.toFixed(2)}`,
            `$${d.totalTeacher.toFixed(2)}`,
            `$${d.totalBespoke.toFixed(2)}`,
            `$${d.balanceRemaining.toFixed(2)}`,
          ]),
          // MODIFICACIÓN: Se añaden los subtotales al pie de la tabla
          foot: [
            [
              {
                content: "Subtotals",
                colSpan: 9,
                styles: { halign: "right", fontStyle: "bold" },
              },
              `$${prof.subtotals.totalTeacher.toFixed(2)}`,
              `$${prof.subtotals.totalBespoke.toFixed(2)}`,
              `$${prof.subtotals.balanceRemaining.toFixed(2)}`,
            ],
          ],
          footStyles: {
            fontStyle: "bold",
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
          },
          theme: "grid",
          headStyles: { fillColor: [76, 84, 158] },
          styles: { fontSize: 8, cellPadding: 1.5 },
          didDrawPage: (data) => {
            finalY = data.cursor?.y || 0;
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
      });

      // --- Tabla de Profesor Especial ---
      if (report.specialProfessorReport) {
        finalY += 5;
        doc.setFontSize(11);
        doc.text(`${report.specialProfessorReport.professorName}`, 14, finalY);
        finalY += 3;

        autoTable(doc, {
          startY: finalY,
          head: [
            [
              "Student",
              "Plan",
              "Amount",
              "Total Hrs",
              "Hrs Seen",
              "Old Bal.",
              "Payment",
              "Total",
              "Bal. Rem.",
            ],
          ],
          body: report.specialProfessorReport.details.map((d) => [
            d.studentName,
            d.plan,
            `$${d.amount.toFixed(2)}`,
            d.totalHours,
            d.hoursSeen,
            `$${d.oldBalance.toFixed(2)}`,
            `$${d.payment.toFixed(2)}`,
            `$${d.total.toFixed(2)}`,
            `$${d.balanceRemaining.toFixed(2)}`,
          ]),
          // MODIFICACIÓN: Se añaden los subtotales al pie de la tabla
          foot: [
            [
              {
                content: "Subtotals",
                colSpan: 7,
                styles: { halign: "right", fontStyle: "bold" },
              },
              `$${report.specialProfessorReport.subtotal.total.toFixed(2)}`,
              `$${report.specialProfessorReport.subtotal.balanceRemaining.toFixed(
                2
              )}`,
            ],
          ],
          footStyles: {
            fontStyle: "bold",
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
          },
          theme: "grid",
          headStyles: { fillColor: [76, 84, 158] },
          styles: { fontSize: 8 },
          didDrawPage: (data) => {
            finalY = data.cursor?.y || 0;
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- Tabla de Excedentes ---
      if (report.excedents && report.excedents.rows.length > 0) {
        finalY += 5;
        doc.setFontSize(11);
        doc.text("Excedents", 14, finalY);
        finalY += 3;

        autoTable(doc, {
          startY: finalY,
          head: [
            ["Student", "Amount", "Hrs Seen", "Price/Hr", "Total", "Notes"],
          ],
          body: report.excedents.rows.map((e) => [
            e.studentName,
            `$${e.amount.toFixed(2)}`,
            e.hoursSeen,
            `$${e.pricePerHour.toFixed(2)}`,
            `$${e.total.toFixed(2)}`,
            e.notes,
          ]),
          // MODIFICACIÓN: Se añade el total al pie de la tabla
          foot: [
            [
              {
                content: "Total Excedents",
                colSpan: 4,
                styles: { halign: "right", fontStyle: "bold" },
              },
              `$${report.excedents.total.toFixed(2)}`,
              "",
            ],
          ],
          footStyles: {
            fontStyle: "bold",
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
          },
          theme: "grid",
          styles: { fontSize: 8 },
          didDrawPage: (data) => {
            finalY = data.cursor?.y || 0;
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- Resumen Final ---
      finalY += 5;
      doc.setFontSize(12);
      doc.text("Final Summary", 14, finalY);
      finalY += 3;

      autoTable(doc, {
        startY: finalY,
        head: [["Concept", "Value"]],
        body: [
          ["System Total", `$${report.summary.systemTotal.toFixed(2)}`],
          ["Real Total (Bank)", `$${report.summary.realTotal.toFixed(2)}`],
          ["Difference", `$${report.summary.difference.toFixed(2)}`],
        ],
        theme: "striped",
        headStyles: { fillColor: [236, 104, 76] },
      });

      doc.save(`report-${report.month}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Hubo un error al generar el PDF.");
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  if (error) return <p className="text-destructive text-center">{error}</p>;
  if (!report) return <p>Report not found.</p>;

  // Ahora esta desestructuración funcionará correctamente
  const {
    report: professorReports,
    specialProfessorReport,
    excedents,
    summary,
  } = report;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title={`Viewing Report: ${format(
          new Date(report.month + "-02"),
          "MMMM yyyy"
        )}`}
        subtitle={
          report.date_report
            ? `Saved on ${format(
                new Date(report.date_report),
                "MMM dd, yyyy - hh:mm a"
              )}`
            : "Saving date not available"
        }
      >
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/accounting/report">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
            </Link>
          </Button>
          <Button onClick={handleGeneratePdf} disabled={isPrinting}>
            {isPrinting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Generate PDF
          </Button>
        </div>
      </PageHeader>

      <div
        id="report-to-print"
        className="space-y-8 bg-white p-4 sm:p-6 rounded-lg"
      >
        {professorReports.map((profReport) => (
          <Card key={profReport.professorId}>
            <CardHeader>
              <CardTitle className="text-lg">
                {profReport.professorName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Price/Hour</TableHead>
                      <TableHead>Hours Seen</TableHead>
                      <TableHead>Pay/Hour</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead className="text-right">
                        Total Teacher
                      </TableHead>
                      <TableHead className="text-right">
                        Total Bespoke
                      </TableHead>
                      <TableHead className="text-right">Balance Rem.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profReport.details.map((detail, detailIndex) => (
                      <TableRow
                        key={detail.enrollmentId || `bonus-${detailIndex}`}
                      >
                        <TableCell>{detail.period}</TableCell>
                        <TableCell>{detail.plan}</TableCell>
                        <TableCell className="font-medium">
                          {detail.studentName}
                        </TableCell>
                        <TableCell>${detail.amount.toFixed(2)}</TableCell>
                        <TableCell>{detail.totalHours}</TableCell>
                        <TableCell>${detail.pricePerHour.toFixed(2)}</TableCell>
                        <TableCell>{detail.hoursSeen}</TableCell>
                        <TableCell>${detail.pPerHour.toFixed(2)}</TableCell>
                        <TableCell>${detail.balance.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          ${detail.totalTeacher.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${detail.totalBespoke.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${detail.balanceRemaining.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={9}></TableCell>
                      <TableCell className="text-right font-bold text-base">
                        ${profReport.subtotals.totalTeacher.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base">
                        ${profReport.subtotals.totalBespoke.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base text-blue-600">
                        ${profReport.subtotals.balanceRemaining.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}

        {specialProfessorReport && (
          <Card key={specialProfessorReport.professorId}>
            <CardHeader>
              <CardTitle className="text-lg">
                {specialProfessorReport.professorName} (Special)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Hours Seen</TableHead>
                      <TableHead>Old Balance</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance Rem.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {specialProfessorReport.details.map(
                      (detail, detailIndex) => (
                        <TableRow
                          key={detail.enrollmentId || `special-${detailIndex}`}
                        >
                          <TableCell className="font-medium">
                            {detail.studentName}
                          </TableCell>
                          <TableCell>{detail.plan}</TableCell>
                          <TableCell>${detail.amount.toFixed(2)}</TableCell>
                          <TableCell>{detail.totalHours}</TableCell>
                          <TableCell>{detail.hoursSeen}</TableCell>
                          <TableCell>${detail.oldBalance.toFixed(2)}</TableCell>
                          <TableCell>${detail.payment.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${detail.total.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            ${detail.balanceRemaining.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-right font-bold text-base"
                      >
                        Subtotals
                      </TableCell>
                      <TableCell className="text-right font-bold text-base">
                        ${specialProfessorReport.subtotal.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base text-blue-600">
                        $
                        {specialProfessorReport.subtotal.balanceRemaining.toFixed(
                          2
                        )}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Excedents</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Hours Seen</TableHead>
                  <TableHead>Price Per Hour</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {excedents.rows.map((row, index) => (
                  <TableRow key={`excedent-${index}`}>
                    <TableCell>{row.studentName}</TableCell>
                    <TableCell>${row.amount.toFixed(2)}</TableCell>
                    <TableCell>{row.hoursSeen}</TableCell>
                    <TableCell>${row.pricePerHour.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${row.total.toFixed(2)}
                    </TableCell>
                    <TableCell>{row.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-end font-bold text-lg">
            Total Excedents: ${excedents.total.toFixed(2)}
          </CardFooter>
        </Card>

        <Card className="max-w-md ml-auto">
          <CardHeader>
            <CardTitle>Final Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>System Total:</Label>
              <span className="font-bold">
                ${summary.systemTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <Label>Real Total (Bank):</Label>
              <span className="font-bold">${summary.realTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <Label className="text-lg font-bold">Difference:</Label>
              <span
                className={`text-lg font-bold ${
                  summary.difference !== 0
                    ? "text-destructive"
                    : "text-green-600"
                }`}
              >
                ${summary.difference.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
