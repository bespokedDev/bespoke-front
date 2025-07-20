"use client";
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
import { Plus, Trash2, Loader2 } from "lucide-react";

// --- DEFINICIONES DE TIPOS ---
interface Divisa {
  _id: string;
  name: string;
}
interface PaymentMethod {
  _id: string;
  name: string;
}
interface ProfessorBrief {
  _id: string;
  name: string;
}
interface StudentBrief {
  _id: string;
  name: string;
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
}

interface Income {
  _id: string;
  deposit_name: string;
  amount: number;
  idDivisa: Divisa;
  idProfessor: ProfessorBrief;
  note: string;
  idPaymentMethod: PaymentMethod;
  idEnrollment: EnrollmentBrief;
  income_date: string;
}

type IncomeFormData = {
  deposit_name: string;
  amount: number;
  idDivisa: string;
  idProfessor: string;
  note: string;
  idPaymentMethod: string;
  idEnrollment: string;
};

const initialIncomeState: IncomeFormData = {
  deposit_name: "",
  amount: 0,
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
  const [openDialog, setOpenDialog] = useState<"create" | "delete" | null>(
    null
  );
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [formData, setFormData] = useState<IncomeFormData>(initialIncomeState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState<string>("");

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
        setIncomes(incomeData);
        setEnrollments(enrollmentData);
        setProfessors(professorData);
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

  const filteredIncomes = useMemo(() => {
    const lowercasedFilter = globalFilter.toLowerCase().trim();
    if (!lowercasedFilter) return incomes;

    return incomes.filter((income) => {
      const studentNames =
        income.idEnrollment?.studentIds
          ?.map((s) => s.name)
          .join(", ")
          .toLowerCase() ?? "";

      const professorName = income.idProfessor?.name?.toLowerCase() ?? "";
      const depositName = income.deposit_name.toLowerCase();
      const note = income.note?.toLowerCase() ?? "";
      const date = income.income_date;

      return (
        studentNames.includes(lowercasedFilter) ||
        professorName.includes(lowercasedFilter) ||
        depositName.includes(lowercasedFilter) ||
        note.includes(lowercasedFilter) ||
        date.includes(lowercasedFilter)
      );
    });
  }, [incomes, globalFilter]);

  const handleOpen = (type: "create" | "delete", income?: Income) => {
    setDialogError(null);
    if (type === "create") {
      setSelectedIncome(null);
      setFormData(initialIncomeState);
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
    setIsSubmitting(true);
    setDialogError(null);
    try {
      await apiClient("api/incomes", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      const incomeData = await apiClient("api/incomes");
      setIncomes(incomeData);
      handleClose();
    } catch (err: any) {
      setDialogError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedIncome) return;
    setIsSubmitting(true);
    setDialogError(null);
    try {
      await apiClient(`api/incomes/${selectedIncome._id}`, {
        method: "DELETE",
      });
      const incomeData = await apiClient("api/incomes");
      setIncomes(incomeData);
      handleClose();
    } catch (err: any) {
      setDialogError(err.message || "Failed to delete income.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // CORRECCIÓN TABLA: Se ajusta la definición de las columnas para que coincida con el tipo esperado.
  const columns = [
    {
      header: "Date",
      accessorKey: "row",
      cell: ({ row }: { row: { original: Income } }) =>
        new Date(row.original.income_date).toLocaleDateString(),
    },
    {
      header: "Deposit Name",
      accessorKey: "row",
      cell: ({ row }: { row: { original: Income } }) =>
        row.original.deposit_name,
    },
    {
      header: "Student(s)",
      accessorKey: "row",
      cell: ({ row }: { row: { original: Income } }) =>
        row.original.idEnrollment?.studentIds?.map((s) => s.name).join(", ") ||
        "N/A",
    },
    {
      header: "Professor",
      accessorKey: "row",
      cell: ({ row }: { row: { original: Income } }) =>
        row.original.idProfessor?.name || "N/A",
    },
    {
      header: "Amount",
      accessorKey: "row",
      cell: ({ row }: { row: { original: Income } }) =>
        `${row.original.idDivisa.name} ${row.original.amount.toFixed(2)}`,
    },
    {
      header: "Actions",
      accessorKey: "row",
      cell: ({ row }: { row: { original: Income } }) => (
        <Button
          size="icon"
          variant="destructive"
          onClick={() => handleOpen("delete", row.original)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ] as const;

  const filteredEnrollmentsForForm = useMemo(() => {
    if (!formData.idProfessor) {
      return [];
    }
    return enrollments.filter(
      (enrollment) => enrollment.professorId?._id === formData.idProfessor
    );
  }, [enrollments, formData.idProfessor]);

  useEffect(() => {
    if (formData.idProfessor) {
      setFormData((prev) => ({ ...prev, idEnrollment: "" }));
    }
  }, [formData.idProfessor]);

  // CORRECCIÓN TABLA: Se transforman los datos al formato anidado que espera el componente DataTable.
  const tableData = useMemo(() => {
    return filteredIncomes.map((income) => ({ row: { original: income } }));
  }, [filteredIncomes]);

  return (
    <div className="space-y-6 bg-light-background dark:bg-dark-background p-4 md:p-6 rounded-lg">
      <PageHeader title="Incomes" subtitle="Manage all company incomes">
        <Button
          className="bg-primary text-white hover:bg-primary/90"
          onClick={() => handleOpen("create")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Income
        </Button>
      </PageHeader>

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && <p className="text-accent-1 text-center">{error}</p>}

      {!isLoading && !error && (
        <Card className="bg-light-card dark:bg-dark-card border-none">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center">
              <Input
                placeholder="Search by name, student, professor, date (YYYY-MM)..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full max-w-lg"
              />
            </div>
            {/* CORRECCIÓN TABLA: Se pasa 'tableData' en lugar de 'filteredIncomes' */}
            <DataTable columns={columns} data={tableData} searchKeys={[]} />
          </CardContent>
        </Card>
      )}

      {/* DIÁLOGO DE CREAR */}
      <Dialog
        open={openDialog === "create"}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register New Income</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4"
          >
            <div className="space-y-2">
              <Label>Deposit Name</Label>
              <Input
                name="deposit_name"
                onChange={(e) =>
                  setFormData((p) => ({ ...p, deposit_name: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
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
                <Label>Currency</Label>
                <Select
                  name="idDivisa"
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, idDivisa: v }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {divisas.map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Professor</Label>
              <Select
                name="idProfessor"
                value={formData.idProfessor}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, idProfessor: v }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a professor first..." />
                </SelectTrigger>
                <SelectContent>
                  {professors.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Enrollment</Label>
              <Select
                name="idEnrollment"
                value={formData.idEnrollment}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, idEnrollment: v }))
                }
                required
                disabled={!formData.idProfessor}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an enrollment..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredEnrollmentsForForm.map((e) => (
                    <SelectItem key={e._id} value={e._id}>
                      {e.studentIds?.map((s) => s.name).join(", ")} - Plan:{" "}
                      {e.planId?.name} ({e.enrollmentType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                name="idPaymentMethod"
                value={formData.idPaymentMethod}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, idPaymentMethod: v }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm._id} value={pm._id}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        </DialogContent>
      </Dialog>
      {/* DIÁLOGO DE ELIMINAR */}
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
    </div>
  );
}
