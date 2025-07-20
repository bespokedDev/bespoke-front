/* eslint-disable @typescript-eslint/no-explicit-any */ "use client";import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileDown, PlusCircle, Trash2, ArrowLeft } from "lucide-react";
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
  reportDateRange: string;
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
  reportDateRange: string;
  details: SpecialReportDetail[];
  subtotal: {
    total: number;
    balanceRemaining: number;
  };
}

interface ExcedentRow {
  id: string;
  enrollmentId: string;
  studentName: string;
  amount: number;
  hoursSeen: number;
  pricePerHour: number;
  total: number;
  notes: string;
}

interface EnrollmentForSelect {
  _id: string;
  studentIds: { name: string }[];
}

interface ReportState {
  general: ProfessorReport[];
  special: SpecialProfessorReport | null;
}

function NewReportComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const month = searchParams.get("month");

  const [reportData, setReportData] = useState<ReportState | null>(null);
  const [excedents, setExcedents] = useState<ExcedentRow[]>([]);
  const [realTotal, setRealTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentForSelect[]>([]);

  const handleGenerateReport = async (reportMonth: string) => {
    setIsLoading(true);
    setError(null);
    setReportData(null);
    try {
      const response = await apiClient(
        `api/incomes/professors-payout-report?month=${reportMonth}`
      );

      const initialGeneralReport = response.report.map((prof: any) => ({
        ...prof,
        subtotals: { totalTeacher: 0, totalBespoke: 0, balanceRemaining: 0 },
      }));

      const initialSpecialReport = response.specialProfessorReport
        ? {
            ...response.specialProfessorReport,
            subtotal: { total: 0, balanceRemaining: 0 },
          }
        : null;

      setReportData({
        general: initialGeneralReport,
        special: initialSpecialReport,
      });
    } catch (err: any) {
      setError(err.message || "Failed to generate report.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    apiClient("api/enrollments").then(setEnrollments).catch(console.error);
    if (month) {
      handleGenerateReport(month);
    } else {
      setError("Month parameter is missing from URL.");
      setIsLoading(false);
    }
  }, [month]);

  const calculatedData = useMemo(() => {
    if (!reportData) return null;

    let grandTotalTeacher = 0,
      grandTotalBespoke = 0,
      grandTotalBalanceRemaining = 0;

    const updatedGeneralReport = reportData.general.map((profReport) => {
      let subTotalTeacher = 0,
        subTotalBespoke = 0,
        subTotalBalanceRemaining = 0;
      const updatedDetails = profReport.details.map((detail) => {
        let totalTeacher = 0,
          totalBespoke = 0,
          balanceRemaining = 0;
        if (detail.status === 1) {
          totalTeacher = detail.hoursSeen * detail.pPerHour;
          totalBespoke = detail.pricePerHour * detail.hoursSeen - totalTeacher;
          balanceRemaining =
            detail.amount + detail.balance - totalTeacher - totalBespoke;
        } else {
          totalTeacher = detail.amount;
          totalBespoke = 0;
          balanceRemaining = 0;
        }
        subTotalTeacher += totalTeacher;
        subTotalBespoke += totalBespoke;
        subTotalBalanceRemaining += balanceRemaining;
        return { ...detail, totalTeacher, totalBespoke, balanceRemaining };
      });
      grandTotalTeacher += subTotalTeacher;
      grandTotalBespoke += subTotalBespoke;
      grandTotalBalanceRemaining += subTotalBalanceRemaining;
      return {
        ...profReport,
        details: updatedDetails,
        subtotals: {
          totalTeacher: subTotalTeacher,
          totalBespoke: subTotalBespoke,
          balanceRemaining: subTotalBalanceRemaining,
        },
      };
    });

    let updatedSpecialReport = null;
    if (reportData.special) {
      let subTotal = 0;
      let subTotalBalanceRemaining = 0;

      const updatedDetails = reportData.special.details.map((detail) => {
        const total = detail.payment;
        const balanceRemaining = detail.amount - detail.payment;
        subTotal += total;
        subTotalBalanceRemaining += balanceRemaining;
        return { ...detail, total, balanceRemaining };
      });

      updatedSpecialReport = {
        ...reportData.special,
        details: updatedDetails,
        subtotal: {
          total: subTotal,
          balanceRemaining: subTotalBalanceRemaining,
        },
      };
    }

    const excedentsTotal = excedents.reduce(
      (acc, excedent) => acc + excedent.total,
      0
    );

    const specialBalanceRemaining =
      updatedSpecialReport?.subtotal.balanceRemaining || 0;
    const systemTotal =
      grandTotalBalanceRemaining + specialBalanceRemaining + excedentsTotal;

    const difference = systemTotal - realTotal;

    return {
      generalReport: updatedGeneralReport,
      specialReport: updatedSpecialReport,
      excedentsTotal,
      grandTotals: {
        grandTotalTeacher,
        grandTotalBespoke,
        grandTotalBalanceRemaining,
      },
      summary: { systemTotal, difference },
    };
  }, [reportData, excedents, realTotal]);

  const updateDetailField = <K extends keyof ReportDetail>(
    profIndex: number,
    detailIndex: number,
    field: K,
    value: ReportDetail[K]
  ) => {
    if (!reportData) return;
    const newData = { ...reportData };
    (newData.general[profIndex].details[detailIndex][field] as any) = value;
    setReportData(newData);
  };

  const updateSpecialDetailField = <K extends keyof SpecialReportDetail>(
    detailIndex: number,
    field: K,
    value: SpecialReportDetail[K]
  ) => {
    if (!reportData?.special) return;
    const newReportData = { ...reportData };
    if (newReportData.special) {
      (newReportData.special.details[detailIndex][field] as any) = value;
      setReportData(newReportData);
    }
  };

  const addBonus = (profIndex: number) => {
    if (!reportData) return;
    const newData = { ...reportData };
    const reportPeriod = newData.general[profIndex]?.reportDateRange || "N/A";
    const periodWithoutYear = reportPeriod.replace(/\s\d{4}/g, "");
    const newBonus: ReportDetail = {
      enrollmentId: null,
      period: periodWithoutYear,
      plan: "N/A",
      studentName: "Bono Manual",
      amount: 0,
      totalHours: 0,
      pricePerHour: 0,
      pPerHour: 0,
      hoursSeen: 0,
      balance: 0,
      totalTeacher: 0,
      totalBespoke: 0,
      balanceRemaining: 0,
      status: 2,
    };
    newData.general[profIndex].details.push(newBonus);
    setReportData(newData);
  };

  const removeBonus = (profIndex: number, detailIndex: number) => {
    if (!reportData) return;
    const newData = { ...reportData };
    if (newData.general[profIndex]?.details) {
      newData.general[profIndex].details.splice(detailIndex, 1);
      setReportData(newData);
    }
  };

  const addExcedentRow = () => {
    const newRow: ExcedentRow = {
      id: crypto.randomUUID(),
      enrollmentId: "",
      studentName: "",
      amount: 0,
      hoursSeen: 0,
      pricePerHour: 0,
      total: 0,
      notes: "",
    };
    setExcedents((prev) => [...prev, newRow]);
  };

  const updateExcedentField = <K extends keyof ExcedentRow>(
    rowIndex: number,
    field: K,
    value: ExcedentRow[K]
  ) => {
    const newExcedents = [...excedents];
    const currentRow = newExcedents[rowIndex];
    (currentRow[field] as any) = value;
    if (field === "enrollmentId") {
      const selectedEnrollment = enrollments.find((e) => e._id === value);
      currentRow.studentName =
        selectedEnrollment?.studentIds.map((s) => s.name).join(", ") || "";
    }
    currentRow.total = currentRow.hoursSeen * currentRow.pricePerHour;
    setExcedents(newExcedents);
  };

  const removeExcedentRow = (id: string) => {
    setExcedents((prev) => prev.filter((row) => row.id !== id));
  };

  const handleGeneratePdf = () => {
    if (!calculatedData || !month) {
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
        `Accounting Report - ${format(new Date(month + "-02"), "MMMM yyyy")}`,
        14,
        finalY
      );
      finalY += 10;

      // --- Tablas de Profesores Generales ---
      calculatedData.generalReport.forEach((prof) => {
        if (finalY > 20) finalY += 5;
        doc.setFontSize(14);
        doc.text(prof.professorName, 14, finalY);
        finalY += 8;

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
          foot: [
            [
              // MODIFICACIÓN: Se corrige 'textAlign' por 'halign'
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
          styles: { fontSize: 7, cellPadding: 1.5 },
          didDrawPage: (data) => {
            finalY = data.cursor?.y || 0;
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
      });

      // --- Tabla de Profesor Especial ---
      if (calculatedData.specialReport) {
        finalY += 5;
        doc.setFontSize(14);
        doc.text(
          `${calculatedData.specialReport.professorName} (Special)`,
          14,
          finalY
        );
        finalY += 8;

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
          body: calculatedData.specialReport.details.map((d) => [
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
          foot: [
            [
              // MODIFICACIÓN: Se corrige 'textAlign' por 'halign'
              {
                content: "Subtotals",
                colSpan: 7,
                styles: { halign: "right", fontStyle: "bold" },
              },
              `$${calculatedData.specialReport.subtotal.total.toFixed(2)}`,
              `$${calculatedData.specialReport.subtotal.balanceRemaining.toFixed(
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
          headStyles: { fillColor: [81, 185, 162] },
          styles: { fontSize: 8 },
          didDrawPage: (data) => {
            finalY = data.cursor?.y || 0;
          },
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
      }

      // --- Tabla de Excedentes ---
      if (excedents.length > 0) {
        finalY += 5;
        doc.setFontSize(14);
        doc.text("Excedents", 14, finalY);
        finalY += 8;

        autoTable(doc, {
          startY: finalY,
          head: [
            ["Student", "Amount", "Hrs Seen", "Price/Hr", "Total", "Notes"],
          ],
          body: excedents.map((e) => [
            e.studentName,
            `$${e.amount.toFixed(2)}`,
            e.hoursSeen,
            `$${e.pricePerHour.toFixed(2)}`,
            `$${e.total.toFixed(2)}`,
            e.notes,
          ]),
          foot: [
            [
              // MODIFICACIÓN: Se corrige 'textAlign' por 'halign'
              {
                content: "Total Excedents",
                colSpan: 4,
                styles: { halign: "right", fontStyle: "bold" },
              },
              `$${calculatedData.excedentsTotal.toFixed(2)}`,
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
      doc.setFontSize(14);
      doc.text("Final Summary", 14, finalY);
      finalY += 8;

      autoTable(doc, {
        startY: finalY,
        head: [["Concept", "Value"]],
        body: [
          ["System Total", `$${calculatedData.summary.systemTotal.toFixed(2)}`],
          ["Real Total (Bank)", `$${realTotal.toFixed(2)}`],
          ["Difference", `$${calculatedData.summary.difference.toFixed(2)}`],
        ],
        theme: "striped",
        headStyles: { fillColor: [41, 41, 41] },
      });

      doc.save(`report-${month}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Hubo un error al generar el PDF.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSaveReport = async () => {
    if (!calculatedData) {
      alert("Report data is not available.");
      return;
    }
    setIsSaving(true);
    const payload = {
      month: month,
      report: calculatedData.generalReport,
      specialProfessorReport: calculatedData.specialReport,
      excedents: { rows: excedents, total: calculatedData.excedentsTotal },
      summary: {
        systemTotal: calculatedData.summary.systemTotal,
        realTotal: realTotal,
        difference: calculatedData.summary.difference,
      },
    };
    try {
      const response = await apiClient("api/general-payment-tracker", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      alert(
        response.message ||
          "Reporte guardado exitosamente. El PDF se generará a continuación."
      );
      await handleGeneratePdf();
      router.push("/accounting/report");
    } catch (err: any) {
      console.error("Failed to save report:", err);
      alert(`Error saving report: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />{" "}
        <p className="text-xl ml-4">Generating report for {month}...</p>
      </div>
    );
  if (error) return <p className="text-destructive text-center p-8">{error}</p>;
  if (!calculatedData)
    return <p className="text-center p-8">No report data to display.</p>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title={`New Report: ${
          month ? format(new Date(month + "-02"), "MMMM yyyy") : ""
        }`}
        subtitle="Fill in or modify the details below to calculate and save the report."
      >
        <Button
          variant="outline"
          onClick={() => router.push("/accounting/report")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel and Go Back
        </Button>
      </PageHeader>
      <div
        id="report-to-print"
        className="space-y-8 bg-white p-4 sm:p-6 rounded-lg"
      >
        {calculatedData.generalReport.map((profReport, profIndex) => (
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
                      <TableHead className="w-[150px]">Period</TableHead>
                      <TableHead className="w-[150px]">Plan</TableHead>
                      <TableHead className="w-[180px]">Student</TableHead>
                      <TableHead className="w-[110px]">Amount</TableHead>
                      <TableHead className="w-[110px]">Total Hours</TableHead>
                      <TableHead className="w-[110px]">Price/Hour</TableHead>
                      <TableHead className="w-[110px]">Hours Seen</TableHead>
                      <TableHead className="w-[110px]">Pay/Hour</TableHead>
                      <TableHead className="w-[110px]">Balance</TableHead>
                      <TableHead className="text-right">
                        Total Teacher
                      </TableHead>
                      <TableHead className="text-right">
                        Total Bespoke
                      </TableHead>
                      <TableHead className="text-right">Balance Rem.</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profReport.details.map((detail, detailIndex) => (
                      <TableRow
                        key={detail.enrollmentId || `bonus-${detailIndex}`}
                      >
                        <TableCell className="px-3">{detail.period}</TableCell>
                        <TableCell>
                          {detail.status === 1 ? (
                            <span className="px-1">{detail.plan}</span>
                          ) : (
                            <Input
                              value={detail.plan}
                              onChange={(e) =>
                                updateDetailField(
                                  profIndex,
                                  detailIndex,
                                  "plan",
                                  e.target.value
                                )
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {detail.status === 1 ? (
                            <span className="font-medium px-1">
                              {detail.studentName}
                            </span>
                          ) : (
                            <Input
                              value={detail.studentName}
                              onChange={(e) =>
                                updateDetailField(
                                  profIndex,
                                  detailIndex,
                                  "studentName",
                                  e.target.value
                                )
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={detail.amount}
                            onChange={(e) =>
                              updateDetailField(
                                profIndex,
                                detailIndex,
                                "amount",
                                Number(e.target.value)
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={detail.totalHours}
                            onChange={(e) =>
                              updateDetailField(
                                profIndex,
                                detailIndex,
                                "totalHours",
                                Number(e.target.value)
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={detail.pricePerHour}
                            onChange={(e) =>
                              updateDetailField(
                                profIndex,
                                detailIndex,
                                "pricePerHour",
                                Number(e.target.value)
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={detail.hoursSeen}
                            onChange={(e) =>
                              updateDetailField(
                                profIndex,
                                detailIndex,
                                "hoursSeen",
                                Number(e.target.value)
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={detail.pPerHour}
                            onChange={(e) =>
                              updateDetailField(
                                profIndex,
                                detailIndex,
                                "pPerHour",
                                Number(e.target.value)
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={detail.balance}
                            onChange={(e) =>
                              updateDetailField(
                                profIndex,
                                detailIndex,
                                "balance",
                                Number(e.target.value)
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {detail.totalTeacher.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {detail.totalBespoke.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {detail.balanceRemaining.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {detail.status === 2 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                removeBonus(profIndex, detailIndex)
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={9}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addBonus(profIndex)}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add Bonus
                        </Button>
                      </TableCell>
                      <TableCell className="text-right font-bold text-base">
                        {profReport.subtotals.totalTeacher.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base">
                        {profReport.subtotals.totalBespoke.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base text-blue-600">
                        {profReport.subtotals.balanceRemaining.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}

        {calculatedData.specialReport && (
          <Card key={calculatedData.specialReport.professorId}>
            <CardHeader>
              <CardTitle className="text-lg">
                {calculatedData.specialReport.professorName} (Special)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Student</TableHead>
                      <TableHead className="w-[150px]">Plan</TableHead>
                      <TableHead className="w-[110px]">Amount</TableHead>
                      <TableHead className="w-[110px]">Total Hours</TableHead>
                      <TableHead className="w-[110px]">Hours Seen</TableHead>
                      <TableHead className="w-[110px]">Old Balance</TableHead>
                      <TableHead className="w-[110px]">Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance Rem.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculatedData.specialReport.details.map(
                      (detail, detailIndex) => (
                        <TableRow key={detail.enrollmentId}>
                          <TableCell className="font-medium">
                            {detail.studentName}
                          </TableCell>
                          <TableCell>{detail.plan}</TableCell>
                          <TableCell>${detail.amount.toFixed(2)}</TableCell>
                          <TableCell>{detail.totalHours}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={detail.hoursSeen}
                              onChange={(e) =>
                                updateSpecialDetailField(
                                  detailIndex,
                                  "hoursSeen",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={detail.oldBalance}
                              onChange={(e) =>
                                updateSpecialDetailField(
                                  detailIndex,
                                  "oldBalance",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={detail.payment}
                              onChange={(e) =>
                                updateSpecialDetailField(
                                  detailIndex,
                                  "payment",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </TableCell>
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
                        $
                        {calculatedData.specialReport.subtotal.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-base text-blue-600">
                        $
                        {calculatedData.specialReport.subtotal.balanceRemaining.toFixed(
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
                  <TableHead className="w-[250px]">
                    Student (from Enrollment)
                  </TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Hours Seen</TableHead>
                  <TableHead>Price Per Hour</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {excedents.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Select
                        value={row.enrollmentId}
                        onValueChange={(v) =>
                          updateExcedentField(index, "enrollmentId", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {enrollments.map((e) => (
                            <SelectItem key={e._id} value={e._id}>
                              {e.studentIds.map((s) => s.name).join(", ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.amount}
                        onChange={(e) =>
                          updateExcedentField(
                            index,
                            "amount",
                            Number(e.target.value)
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.hoursSeen}
                        onChange={(e) =>
                          updateExcedentField(
                            index,
                            "hoursSeen",
                            Number(e.target.value)
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.pricePerHour}
                        onChange={(e) =>
                          updateExcedentField(
                            index,
                            "pricePerHour",
                            Number(e.target.value)
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.notes}
                        onChange={(e) =>
                          updateExcedentField(index, "notes", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExcedentRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={7}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addExcedentRow}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Excedent
                    </Button>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-end font-bold text-lg">
            Total Excedents: ${calculatedData.excedentsTotal.toFixed(2)}
          </CardFooter>
        </Card>
        <Card className="max-w-md ml-auto">
          <CardHeader>
            <CardTitle>Final Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex justify-between items-center">
              <Label>Total Balance Remaining:</Label>
              <span className="font-semibold">
                $
                {calculatedData.grandTotals.grandTotalBalanceRemaining.toFixed(
                  2
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <Label>Total Excedents:</Label>
              <span className="font-semibold">
                ${calculatedData.excedentsTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <Label className="text-lg font-bold">System Total:</Label>
              <span className="text-lg font-bold">
                ${calculatedData.summary.systemTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="realTotal">Real Total (from bank):</Label>
              <Input
                id="realTotal"
                type="number"
                value={realTotal}
                onChange={(e) => setRealTotal(Number(e.target.value))}
                className="w-32 font-semibold"
              />
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <Label className="text-lg font-bold">Difference:</Label>
              <span
                className={`text-lg font-bold ${
                  calculatedData.summary.difference !== 0
                    ? "text-destructive"
                    : "text-green-600"
                }`}
              >
                ${calculatedData.summary.difference.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          variant="secondary"
          onClick={handleGeneratePdf}
          disabled={isPrinting || isSaving}
        >
          {isPrinting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          Generate PDF
        </Button>
        <Button onClick={handleSaveReport} disabled={isSaving || isPrinting}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Report
        </Button>
      </div>
    </div>
  );
}

export default function NewReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <NewReportComponent />
    </Suspense>
  );
}
