/* eslint-disable @typescript-eslint/no-explicit-any */"use client";
import { useState, useEffect, useMemo } from "react";
import { apiClient } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Trash2,
  Loader2,
  FileText,
  ArrowUpDown,
  ChevronsUpDown,
  X,
  Pencil,
  Eye,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateForDisplay, createDateSortingFunction, getCurrentDateString, dateStringToISO, extractDatePart } from "@/lib/dateUtils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

// --- DEFINICIONES DE TIPOS ---
interface Divisa {
  _id: string;
  name: string;
}
interface PaymentMethod {
  _id: string;
  name: string;
  type: string;
}
interface ProfessorBrief {
  _id: string;
  name: string;
  ciNumber: string;
}
interface StudentBrief {
  _id: string;
  name: string;
  studentCode: string;
}
interface PlanBrief {
  _id: string;
  name: string;
}
interface EnrollmentBrief {
  _id: string;
  studentIds: StudentBrief[];
  planId: PlanBrief;
  professorId: ProfessorBrief;
  enrollmentType: string;
  purchaseDate: string;
  pricePerStudent: number;
  totalAmount: number;
  status: string;
  alias?: string;
}
interface Income {
  _id: string;
  deposit_name: string;
  amount: number;
  amountInDollars: number;
  tasa: number;
  idDivisa: Divisa;
  idProfessor: ProfessorBrief;
  note: string;
  idPaymentMethod: PaymentMethod;
  idEnrollment: EnrollmentBrief;
  income_date: string;
  createdAt: string;
  updatedAt: string;
}
type IncomeFormData = {
  income_date?: string;
  deposit_name: string;
  amount: number;
  amountInDollars: number;
  tasa: number;
  idDivisa: string;
  idProfessor: string;
  note: string;
  idPaymentMethod: string;
  idEnrollment: string;
};

interface SummaryItem {
  paymentMethodId: string;
  paymentMethodName: string;
  totalAmount: number;
  numberOfIncomes: number;
}

const initialIncomeState: IncomeFormData = {
  income_date: getCurrentDateString(), // Fecha actual por defecto
  deposit_name: "",
  amount: 0,
  amountInDollars: 0,
  tasa: 1,
  idDivisa: "",
  idProfessor: "",
  note: "",
  idPaymentMethod: "",
  idEnrollment: "",
};

// --- COMPONENTE PRINCIPAL ---
export default function IncomesPage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentBrief[]>([]);
  const [professors, setProfessors] = useState<ProfessorBrief[]>([]);
  const [divisas, setDivisas] = useState<Divisa[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "delete" | "view" | null
  >(null);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [formData, setFormData] = useState<IncomeFormData>(initialIncomeState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryStartDate, setSummaryStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [summaryEndDate, setSummaryEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [
          incomeData,
          enrollmentData,
          professorData,
          divisaData,
          paymentMethodData,
        ] = await Promise.all([
          apiClient("api/incomes"),
          apiClient("api/enrollments"),
          apiClient("api/professors"),
          apiClient("api/divisas"),
          apiClient("api/payment-methods"),
        ]);
        console.log("incomeData", incomeData);
        // Normalizar los datos para asegurar que tengan los campos requeridos
        const normalizedIncomes = incomeData.map((income: any) => ({
          ...income,
          amountInDollars:
            income.amountInDollars || income.amount / (income.tasa || 1),
          tasa: income.tasa || 1,
          amount: income.amount || 0,
        }));
        setIncomes(normalizedIncomes);
        setEnrollments(enrollmentData);
        // Ordenar profesores alfabéticamente
        const sortedProfessors = professorData.sort(
          (a: ProfessorBrief, b: ProfessorBrief) => a.name.localeCompare(b.name)
        );
        setProfessors(sortedProfessors);
        setDivisas(divisaData);
        setPaymentMethods(paymentMethodData);
      } catch (err: any) {
        setError(err.message || "Failed to fetch initial data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleGenerateSummaryPdf = async () => {
    setIsGeneratingReport(true);
    try {
      const response = await apiClient(
        `api/incomes/summary-by-payment-method?startDate=${summaryStartDate}&endDate=${summaryEndDate}`
      );

      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("Incomes Summary by Payment Method", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Period: ${summaryStartDate} to ${summaryEndDate}`, 14, 28);

      autoTable(doc, {
        startY: 35,
        head: [["Payment Method", "Number of Incomes", "Total Amount"]],
        body: response.summary.map((item: SummaryItem) => [
          item.paymentMethodName,
          item.numberOfIncomes,
          `$${item.totalAmount.toFixed(2)}`,
        ]),
        foot: [
          [
            {
              content: "Grand Total",
              colSpan: 2,
              styles: { halign: "right", fontStyle: "bold" },
            },
            `$${response.grandTotalAmount.toFixed(2)}`,
          ],
        ],
        footStyles: {
          fontStyle: "bold",
          fontSize: 11,
          fillColor: [104, 109, 157],
        },
        headStyles: { fillColor: [76, 84, 158] },
      });

      doc.save(`incomes-summary-${summaryStartDate}_${summaryEndDate}.pdf`);
      setIsSummaryModalOpen(false);
    } catch (err: any) {
      alert(`Error generating report: ${err.message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleOpen = (type: "create" | "edit" | "delete" | "view", income?: Income) => {
    setDialogError(null);
    if (type === "create") {
      setSelectedIncome(null);
      setFormData(initialIncomeState);
    } else if (type === "edit" && income) {
      setSelectedIncome(income);
      setFormData({
        income_date: income.income_date
          ? extractDatePart(income.income_date)
          : "",
        deposit_name: income.deposit_name || "",
        amount: income.amount || 0,
        amountInDollars: income.amountInDollars || 0,
        tasa: income.tasa || 1,
        idDivisa: income.idDivisa?._id || "",
        idProfessor: income.idProfessor?._id || "",
        note: income.note || "",
        idPaymentMethod: income.idPaymentMethod?._id || "",
        idEnrollment: income.idEnrollment?._id || "",
      });
    } else if (income) {
      setSelectedIncome(income);
    }
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones de campos obligatorios
    if (!formData.deposit_name.trim()) {
      setDialogError("El nombre de depósito es obligatorio.");
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      setDialogError("El monto es obligatorio y debe ser mayor a 0.");
      return;
    }

    if (!formData.idDivisa) {
      setDialogError("La divisa es obligatoria.");
      return;
    }

    if (!formData.idPaymentMethod) {
      setDialogError("El tipo de pago es obligatorio.");
      return;
    }

    if (!formData.tasa || formData.tasa <= 0) {
      setDialogError("La tasa de cambio es obligatoria y debe ser mayor a 0.");
      return;
    }

    setIsSubmitting(true);
    setDialogError(null);
    try {
      // Calcular amountInDollars basado en la tasa
      const amountInDollars = formData.amount / formData.tasa;

      const incomePayload = {
        ...formData,
        amountInDollars: amountInDollars,
        // Convertir income_date a ISO string si está presente
        income_date: formData.income_date
          ? dateStringToISO(formData.income_date)
          : undefined,
      };

      console.log("incomePayload", incomePayload);
      
      if (openDialog === "create") {
        const response = await apiClient("api/incomes", {
          method: "POST",
          body: JSON.stringify(incomePayload),
        });
        // Actualizar la lista con el nuevo ingreso
        setIncomes((prev) => [...prev, response.income]);
      } else if (openDialog === "edit" && selectedIncome) {
        const response = await apiClient(`api/incomes/${selectedIncome._id}`, {
          method: "PUT",
          body: JSON.stringify(incomePayload),
        });
        // Actualizar el ingreso en la lista
        setIncomes((prev) =>
          prev.map((income) =>
            income._id === selectedIncome._id ? response.income : income
          )
        );
      }

      handleClose();
    } catch (err: any) {
      if (err.message.includes("400")) {
        setDialogError("Datos inválidos o errores de validación.");
      } else if (err.message.includes("404")) {
        setDialogError("Ingreso no encontrado.");
      } else if (err.message.includes("409")) {
        setDialogError("Error de duplicidad.");
      } else if (err.message.includes("500")) {
        setDialogError("Error interno del servidor.");
      } else {
        setDialogError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedIncome) return;
    setIsSubmitting(true);
    setDialogError(null);
    try {
      const response = await apiClient(`api/incomes/${selectedIncome._id}`, {
        method: "DELETE",
      });

      // Remover el ingreso de la lista
      setIncomes((prev) =>
        prev.filter((income) => income._id !== selectedIncome._id)
      );
      handleClose();
    } catch (err: any) {
      if (err.message.includes("400")) {
        setDialogError("ID inválido.");
      } else if (err.message.includes("404")) {
        setDialogError("Ingreso no encontrado.");
      } else if (err.message.includes("500")) {
        setDialogError("Error interno del servidor.");
      } else {
        setDialogError(err.message || "Failed to delete income.");
      }
    } finally {
      setIsSubmitting(false);
    }
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

  const columns = useMemo<ColumnDef<Income, any>[]>(() => {
    return [
      {
        id: "date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Date
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        accessorKey: "income_date",
        sortingFn: createDateSortingFunction("income_date"),
        cell: ({ row }) => formatDateForDisplay(row.original.income_date),
      },
      {
        id: "deposit_name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Deposit Name
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        accessorKey: "deposit_name",
        sortingFn: stringLocaleSort(),
        cell: ({ row }) => row.original.deposit_name,
      },
      {
        id: "student",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Student(s)
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        accessorKey: "idEnrollment.studentIds",
        sortingFn: stringLocaleSort(),
        cell: ({ row }) =>
          row.original.idEnrollment?.studentIds
            ?.map((s) => s.name)
            .join(", ") || "N/A",
      },
      {
        id: "professor",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Professor
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        accessorKey: "idProfessor.name",
        sortingFn: stringLocaleSort(),
        cell: ({ row }) => row.original.idProfessor?.name || "N/A",
      },

      {
        id: "paymentMethod",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Payment Method
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        accessorKey: "idPaymentMethod.name",
        sortingFn: stringLocaleSort(),
        cell: ({ row }) => row.original.idPaymentMethod?.name || "N/A",
      },
      {
        id: "amount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Amount
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        accessorKey: "amount",
        sortingFn: stringLocaleSort(),
        cell: ({ row }) => {
          const amount = row.original.amount || 0;
          const divisa = row.original.idDivisa;
          return `${amount.toFixed(2)} ${divisa?.name || ""}`;
        },
      },
      {
        id: "amountInDollars",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Amount (USD)
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        ),
        accessorKey: "amountInDollars",
        sortingFn: stringLocaleSort(),
        cell: ({ row }) => {
          const amountInDollars = row.original.amountInDollars || 0;
          return `$${amountInDollars.toFixed(2)}`;
        },
      },
      {
        id: "actions",
        header: "Actions",
        accessorKey: "row",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              className="text-secondary border-secondary/50 hover:bg-secondary/10"
              onClick={() => handleOpen("view", row.original)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="text-primary border-primary/50 hover:bg-primary/10"
              onClick={() => handleOpen("edit", row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="text-accent-1 border-accent-1/50 hover:bg-accent-1/10"
              onClick={() => handleOpen("delete", row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ];
  }, []);

  const filteredEnrollmentsForForm = useMemo(() => {
    if (!formData.idProfessor) {
      return [];
    }
    return enrollments.filter(
      (enrollment) => enrollment.professorId?._id === formData.idProfessor
    );
  }, [enrollments, formData.idProfessor]);

  // Calcular monto en dólares
  const amountInDollars = useMemo(() => {
    const selectedDivisa = divisas.find((d) => d._id === formData.idDivisa);
    if (
      !selectedDivisa ||
      selectedDivisa.name.toLowerCase() === "dollar" ||
      selectedDivisa.name.toLowerCase() === "dólar"
    ) {
      return formData.amount;
    }
    return formData.amount / (formData.tasa || 1);
  }, [formData.amount, formData.idDivisa, formData.tasa, divisas]);

  useEffect(() => {
    if (formData.idProfessor) {
      setFormData((prev) => ({ ...prev, idEnrollment: "" }));
    }
  }, [formData.idProfessor]);

  // Resetear tasa cuando cambie la divisa
  useEffect(() => {
    const selectedDivisa = divisas.find((d) => d._id === formData.idDivisa);
    if (
      selectedDivisa &&
      (selectedDivisa.name.toLowerCase() === "dollar" ||
        selectedDivisa.name.toLowerCase() === "dólar")
    ) {
      setFormData((prev) => ({ ...prev, tasa: 1 }));
    }
  }, [formData.idDivisa, divisas]);

  return (
    <div className="space-y-6">
      <PageHeader title="Incomes" subtitle="Manage all company incomes">
        <div className="flex gap-2">
          <Button className="hover:bg-secondary/90" variant="outline" onClick={() => setIsSummaryModalOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Summary Report
          </Button>
          <Button
            className="bg-primary text-white hover:bg-primary/90"
            onClick={() => handleOpen("create")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Income
          </Button>
        </div>
      </PageHeader>

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && <p className="text-accent-1 text-center">{error}</p>}

      {!isLoading && !error && (
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={incomes}
              searchKeys={[
                "deposit_name",
                "idProfessor.name",
                "idEnrollment.studentIds",
                "idPaymentMethod.name",
                "note",
                "income_date",
                "amount",
                "amountInDollars",
              ]}
              searchPlaceholder="Search incomes..."
            />
          </CardContent>
        </Card>
      )}

      <Dialog
        open={openDialog === "create" || openDialog === "edit" || openDialog === "view"}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Register New Income"}
              {openDialog === "edit" && "Edit Income"}
              {openDialog === "view" && "Income Details"}
            </DialogTitle>
          </DialogHeader>
          {(openDialog === "create" || openDialog === "edit") && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4"
            >
            <div className="space-y-2">
              <Label>Income Date</Label>
              <Input
                name="income_date"
                type="date"
                value={formData.income_date}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, income_date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                Deposit Name <span className="text-red-500">*</span>
              </Label>
              <Input
                name="deposit_name"
                value={formData.deposit_name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, deposit_name: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      amount: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Currency <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  items={divisas}
                  selectedId={formData.idDivisa}
                  onSelectedChange={(v) =>
                    setFormData((p) => ({ ...p, idDivisa: v }))
                  }
                  placeholder="Select currency..."
                />
              </div>
            </div>
            {/* Campos de tasa y conversión */}
            {(() => {
              const selectedDivisa = divisas.find(
                (d) => d._id === formData.idDivisa
              );
              const isDollar =
                selectedDivisa &&
                (selectedDivisa.name.toLowerCase() === "dollar" ||
                  selectedDivisa.name.toLowerCase() === "dólar");

              return !isDollar && selectedDivisa ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tasa de cambio ({selectedDivisa.name} → USD)</Label>
                    <Input
                      name="tasa"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.tasa}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          tasa: Number(parseFloat(e.target.value).toFixed(2)),
                        }))
                      }
                      required
                      placeholder="Ej: 35.50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Monto en USD</Label>
                    <Label className="text-lg">
                      {amountInDollars.toFixed(2)}
                    </Label>
                  </div>
                </div>
              ) : null;
            })()}
            <div className="space-y-2">
              <Label>Professor</Label>
              <SearchableSelect
                items={professors}
                selectedId={formData.idProfessor}
                onSelectedChange={(v) =>
                  setFormData((p) => ({ ...p, idProfessor: v }))
                }
                placeholder="Select a professor..."
              />
            </div>
            <div className="space-y-2">
              <Label>Enrollment</Label>
              <SearchableEnrollmentSelect
                enrollments={filteredEnrollmentsForForm}
                selectedId={formData.idEnrollment}
                onSelectedChange={(v) =>
                  setFormData((p) => ({ ...p, idEnrollment: v }))
                }
                placeholder="Select an enrollment..."
                disabled={!formData.idProfessor}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Payment Method <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                items={paymentMethods}
                selectedId={formData.idPaymentMethod}
                onSelectedChange={(v) =>
                  setFormData((p) => ({ ...p, idPaymentMethod: v }))
                }
                placeholder="Select payment method..."
              />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                name="note"
                onChange={(e) =>
                  setFormData((p) => ({ ...p, note: e.target.value }))
                }
                placeholder="e.g., Payment for 4 advanced English classes..."
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="text-red-500">*</span> Campos obligatorios
            </div>
            <DialogFooter className="pt-4 border-t">
              <p className="text-sm text-accent-1 mr-auto">{dialogError}</p>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Register Income
              </Button>
            </DialogFooter>
          </form>
          )}

          {openDialog === "view" && selectedIncome && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <Label className="font-semibold">Deposit Name</Label>
                  <p className="text-sm font-semibold">{selectedIncome.deposit_name}</p>
                </div>
                <div>
                  <Label className="font-semibold">Income Date</Label>
                  <p className="text-sm">{formatDateForDisplay(selectedIncome.income_date)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Amount</Label>
                  <p className="text-sm font-semibold">${(selectedIncome.amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Amount in Dollars</Label>
                  <p className="text-sm font-semibold">${(selectedIncome.amountInDollars || 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Exchange Rate</Label>
                  <p className="text-sm">{(selectedIncome.tasa || 1).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Currency</Label>
                  <p className="text-sm">{selectedIncome.idDivisa?.name || "N/A"}</p>
                </div>
                <div>
                  <Label className="font-semibold">Professor</Label>
                  <p className="text-sm">{selectedIncome.idProfessor?.name || "N/A"}</p>
                </div>
                <div>
                  <Label className="font-semibold">Payment Method</Label>
                  <p className="text-sm">{selectedIncome.idPaymentMethod?.name || "N/A"}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="font-semibold">Enrollment</Label>
                  <p className="text-sm">
                    {selectedIncome.idEnrollment ? 
                      `${selectedIncome.idEnrollment.planId?.name || "N/A"} - ${selectedIncome.idEnrollment.studentIds?.map(s => s.name).join(", ") || "N/A"}` 
                      : "N/A"
                    }
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label className="font-semibold">Note</Label>
                  <p className="text-sm">{selectedIncome.note || "N/A"}</p>
                </div>
              </div>
              <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDialog === "delete"}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to permanently delete the income:{" "}
            <strong className="text-foreground">
              {selectedIncome?.deposit_name}
            </strong>
            ?
          </DialogDescription>
          <DialogFooter>
            <p className="text-sm text-accent-1 mr-auto">{dialogError}</p>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Income Summary Report</DialogTitle>
            <DialogDescription>
              Select a date range to generate the PDF report.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="summary-start-date">Start Date</Label>
              <Input
                id="summary-start-date"
                type="date"
                value={summaryStartDate}
                onChange={(e) => setSummaryStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary-end-date">End Date</Label>
              <Input
                id="summary-end-date"
                type="date"
                value={summaryEndDate}
                onChange={(e) => setSummaryEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSummaryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateSummaryPdf}
              disabled={isGeneratingReport}
            >
              {isGeneratingReport && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- COMPONENTE SEARCHABLE SELECT REUTILIZABLE ---
function SearchableSelect({
  items,
  selectedId,
  onSelectedChange,
  placeholder,
}: {
  items: { _id: string; name: string }[];
  selectedId: string;
  onSelectedChange: (id: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  const selectedItem = items.find((item) => item._id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 hover:!bg-primary/30 dark:hover:!primary/30"
        >
          {selectedItem ? selectedItem.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>No item found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {items.map((item) => (
              <CommandItem
                key={item._id}
                value={item.name}
                onSelect={() => {
                  onSelectedChange(item._id);
                  setOpen(false);
                }}
                className="hover:!bg-secondary/20 dark:hover:!secondary/30"
              >
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// --- COMPONENTE SEARCHABLE ENROLLMENT SELECT ---
function SearchableEnrollmentSelect({
  enrollments,
  selectedId,
  onSelectedChange,
  placeholder,
  disabled = false,
}: {
  enrollments: EnrollmentBrief[];
  selectedId: string;
  onSelectedChange: (id: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selectedEnrollment = enrollments.find(
    (item) => item._id === selectedId
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-auto min-h-10 hover:!bg-primary/30 dark:hover:!primary/30"
        >
          {selectedEnrollment ? (
            <div className="text-left">
              {selectedEnrollment.alias ||
                selectedEnrollment.studentIds
                  ?.map((s) => s.name)
                  .join(", ")}{" "}
              - Plan: {selectedEnrollment.planId?.name} (
              {selectedEnrollment.enrollmentType})
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>No enrollment found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {enrollments.map((enrollment) => (
              <CommandItem
                key={enrollment._id}
                value={`${
                  enrollment.alias ||
                  enrollment.studentIds?.map((s) => s.name).join(", ")
                } ${enrollment.planId?.name} ${enrollment.enrollmentType}`}
                onSelect={() => {
                  onSelectedChange(enrollment._id);
                  setOpen(false);
                }}
                className="hover:!bg-secondary/20 dark:hover:!secondary/30"
              >
                <div className="text-left">
                  {enrollment.alias ||
                    enrollment.studentIds?.map((s) => s.name).join(", ")}{" "}
                  - Plan: {enrollment.planId?.name} ({enrollment.enrollmentType}
                  )
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
