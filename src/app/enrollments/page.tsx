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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DataTable } from "@/components/ui/data-table";
import {
  Plus,
  Pencil,
  Ban,
  CheckCircle2,
  Loader2,
  ChevronsUpDown,
  X,
} from "lucide-react";

// --- DEFINICIONES DE TIPOS ---
// Tipos para los datos que vamos a fetchear para los selects
interface Plan {
  _id: string;
  name: string;
  pricing: { single: number; couple: number; group: number };
}
interface StudentBrief {
  _id: string;
  name: string;
}
interface ProfessorBrief {
  _id: string;
  name: string;
}

// Tipo principal para la matrícula
interface Enrollment {
  _id: string;
  planId: Plan;
  studentIds: StudentBrief[];
  professorId?: ProfessorBrief | null;
  enrollmentType: "single" | "couple" | "group";
  scheduledDays: Array<{ day: string }> | string | null;
  purchaseDate: string;
  pricePerStudent: number;
  totalAmount: number;
  status: string;
  isActive: boolean;
}

// Tipo para el formulario
type EnrollmentFormData = {
  planId: string;
  studentIds: string[];
  professorId?: string;
  enrollmentType: "single" | "couple" | "group";
  scheduledDays: string[];
  purchaseDate: string;
  pricePerStudent: number;
  totalAmount: number;
  status: string;
};

// --- ESTADO INICIAL ---
const initialEnrollmentState: EnrollmentFormData = {
  planId: "",
  studentIds: [],
  professorId: "",
  enrollmentType: "single",
  scheduledDays: [],
  purchaseDate: new Date().toISOString().split("T")[0],
  pricePerStudent: 0,
  totalAmount: 0,
  status: "No Active",
};

const weekDays = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// --- COMPONENTE PRINCIPAL ---
export default function EnrollmentsPage() {
  // Datos principales y de soporte
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [students, setStudents] = useState<StudentBrief[]>([]);
  const [professors, setProfessors] = useState<ProfessorBrief[]>([]);

  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "status" | null
  >(null);
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<Enrollment | null>(null);
  const [formData, setFormData] = useState<EnrollmentFormData>(
    initialEnrollmentState
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const searchableData = useMemo(() => {
    return enrollments.map((enrollment) => {
      const studentNames = enrollment.studentIds.map((s) => s.name).join(" ");
      const planName = enrollment.planId.name;
      const professorName = enrollment.professorId?.name || "";

      return {
        ...enrollment,
        searchableString: `${studentNames} ${planName} ${professorName}`,
      };
    });
  }, [enrollments]);

  // --- LÓGICA DE DATOS Y FORMULARIO ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [enrollmentData, planData, studentData, professorData] =
          await Promise.all([
            apiClient("api/enrollments"),
            apiClient("api/plans"),
            apiClient("api/students"),
            apiClient("api/professors"),
          ]);
        setEnrollments(enrollmentData);
        setPlans(planData);
        setStudents(studentData);
        setProfessors(professorData);
      } catch (err: any) {
        setError(err.message || "Failed to fetch data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Efecto para calcular el precio dinámicamente
  useEffect(() => {
    const selectedPlan = plans.find((p) => p._id === formData.planId);
    if (!selectedPlan) return;

    let pricePerStudent = 0;
    let enrollmentType: "single" | "couple" | "group" = "group";

    if (formData.studentIds.length === 1) {
      pricePerStudent = selectedPlan.pricing.single;
      enrollmentType = "single";
    } else if (formData.studentIds.length === 2) {
      pricePerStudent = selectedPlan.pricing.couple;
      enrollmentType = "couple";
    } else if (formData.studentIds.length > 2) {
      pricePerStudent = selectedPlan.pricing.group;
      enrollmentType = "group";
    }

    const totalAmount = pricePerStudent * formData.studentIds.length;

    setFormData((prev) => ({
      ...prev,
      pricePerStudent,
      totalAmount,
      enrollmentType,
    }));
  }, [formData.planId, formData.studentIds, plans]);

  // --- MANEJADORES ---
  const handleOpen = (
    type: "create" | "edit" | "status",
    enrollment?: Enrollment
  ) => {
    setDialogError(null);
    if (type === "create") {
      setSelectedEnrollment(null);
      setFormData(initialEnrollmentState);
    } else if (enrollment) {
      setSelectedEnrollment(enrollment);
      let scheduledDaysArray: string[] = [];
      if (
        typeof enrollment.scheduledDays === "string" &&
        enrollment.scheduledDays
      ) {
        scheduledDaysArray = enrollment.scheduledDays
          .split(",")
          .map((s) => s.trim());
      } else if (Array.isArray(enrollment.scheduledDays)) {
        scheduledDaysArray = enrollment.scheduledDays.map((d) => d.day);
      }
      setFormData({
        planId: enrollment.planId._id,
        studentIds: enrollment.studentIds.map((s) => s._id),
        professorId: enrollment.professorId?._id || "",
        enrollmentType: enrollment.enrollmentType,
        scheduledDays: scheduledDaysArray,
        purchaseDate: new Date(enrollment.purchaseDate)
          .toISOString()
          .split("T")[0],
        pricePerStudent: enrollment.pricePerStudent,
        totalAmount: enrollment.totalAmount,
        status: enrollment.status,
      });
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
    // Transforma scheduledDays a la estructura correcta si es necesario
    const payload = {
      ...formData,
      scheduledDays: formData.scheduledDays.join(", "), // O el formato que tu API espere
    };
    try {
      if (openDialog === "create") {
        await apiClient("api/enrollments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else if (openDialog === "edit" && selectedEnrollment) {
        await apiClient(`api/enrollments/${selectedEnrollment._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      // Refrescar solo los enrollments para optimizar
      const enrollmentData = await apiClient("api/enrollments");
      setEnrollments(enrollmentData);
      handleClose();
    } catch (err: any) {
      setDialogError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedEnrollment) return;
    setIsSubmitting(true);
    setDialogError(null);
    const action = selectedEnrollment.isActive ? "deactivate" : "activate";
    try {
      await apiClient(`api/enrollments/${selectedEnrollment._id}/${action}`, {
        method: "PATCH",
      });
      const enrollmentData = await apiClient("api/enrollments");
      setEnrollments(enrollmentData);
      handleClose();
    } catch (err: any) {
      setDialogError(err.message || "Failed to update status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- DEFINICIÓN DE COLUMNAS ---
  const columns = [
    {
      header: "Students",
      accessorKey: "studentIds",
      cell: (item: Enrollment) => (
        <div>{item.studentIds.map((s) => s.name).join(", ")}</div>
      ),
    },
    {
      header: "Plan",
      accessorKey: "planId",
      cell: (item: Enrollment) => item.planId.name,
    },
    {
      header: "Professor",
      accessorKey: "professorId",
      cell: (item: Enrollment) => item.professorId?.name || "N/A",
    },
    { header: "Status", accessorKey: "status" },
    {
      header: "Active",
      accessorKey: "isActive",
      cell: (item: Enrollment) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            item.isActive
              ? "bg-secondary/20 text-secondary"
              : "bg-accent-1/20 text-accent-1"
          }`}
        >
          {item.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      accessorKey: "_id",
      cell: (item: Enrollment) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            className="text-primary border-primary/50 hover:bg-primary/10"
            onClick={() => handleOpen("edit", item)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="text-accent-1 border-accent-1/50 hover:bg-accent-1/10"
            onClick={() => handleOpen("status", item)}
          >
            {item.isActive ? (
              <Ban className="h-4 w-4 text-accent-1" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-secondary" />
            )}
          </Button>
        </div>
      ),
    },
  ] as const;

  // --- RENDERIZADO ---
  return (
    <div className="space-y-6 bg-light-background dark:bg-dark-background p-4 md:p-6 rounded-lg">
      <PageHeader
        title="Enrollments"
        subtitle="Manage student enrollments in plans and classes"
      >
        <Button
          className="bg-primary text-white hover:bg-primary/90"
          onClick={() => handleOpen("create")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Enrollment
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
          <CardContent className="pt-6">
            <DataTable
              columns={columns}
              data={searchableData}
              searchKeys={["searchableString"]}
              searchPlaceholder="Search..."
            />
          </CardContent>
        </Card>
      )}

      {/* --- DIÁLOGO DE CREAR/EDITAR --- */}
      <Dialog
        open={openDialog === "create" || openDialog === "edit"}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create"
                ? "Create Enrollment"
                : "Edit Enrollment"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Plan */}
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={formData.planId}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, planId: v }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Professor */}
              <div className="space-y-2">
                <Label>Professor</Label>
                <Select
                  value={formData.professorId}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, professorId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a professor..." />
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
            </div>
            {/* Students Multi-Select */}
            <div className="space-y-2">
              <Label>Students</Label>
              <MultiSelect
                items={students}
                selectedIds={formData.studentIds}
                onSelectedChange={(ids) =>
                  setFormData((p) => ({ ...p, studentIds: ids }))
                }
                placeholder="Select students..."
              />
            </div>
            {/* Scheduled Days */}
            <div className="space-y-2">
              <Label>Scheduled Days</Label>
              <MultiSelect
                items={weekDays.map((d) => ({ _id: d, name: d }))}
                selectedIds={formData.scheduledDays}
                onSelectedChange={(days) =>
                  setFormData((p) => ({ ...p, scheduledDays: days }))
                }
                placeholder="Select days..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Purchase Date */}
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, purchaseDate: e.target.value }))
                  }
                  required
                />
              </div>
              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, status: v }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="No Active">No Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Pricing Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Type</Label>
                <p className="font-semibold capitalize">
                  {formData.enrollmentType}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">
                  Price/Student
                </Label>
                <p className="font-semibold">
                  ${formData.pricePerStudent.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">
                  Total Amount
                </Label>
                <p className="font-semibold">
                  ${formData.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t">
              <p className="text-sm text-accent-1 mr-auto">{dialogError}</p>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}{" "}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- DIÁLOGO DE STATUS --- */}
      <Dialog
        open={openDialog === "status"}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to{" "}
            {selectedEnrollment?.isActive ? "deactivate" : "activate"} this
            enrollment?
          </DialogDescription>
          <DialogFooter>
            <p className="text-sm text-accent-1 mr-auto">{dialogError}</p>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant={selectedEnrollment?.isActive ? "destructive" : "default"}
              onClick={handleToggleStatus}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {selectedEnrollment?.isActive ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- COMPONENTE MULTI-SELECT REUTILIZABLE ---
function MultiSelect({
  items,
  selectedIds,
  onSelectedChange,
  placeholder,
}: {
  items: { _id: string; name: string }[];
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (id: string) => {
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    onSelectedChange(newSelectedIds);
  };

  const selectedItems = items.filter((item) => selectedIds.includes(item._id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 hover:!bg-primary/30 dark:hover:!primary/30"
        >
          <div className="flex gap-1 flex-wrap">
            {selectedItems.length > 0
              ? selectedItems.map((item) => (
                  <span
                    key={item._id}
                    className="bg-muted text-muted-foreground text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1"
                  >
                    {item.name}
                    <div
                      className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation(); // Previene que el popover se cierre
                        handleSelect(item._id);
                      }}
                    >
                      <X className="h-3 w-3 cursor-pointer" />
                    </div>
                  </span>
                ))
              : placeholder}
          </div>
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
                onSelect={() => handleSelect(item._id)}
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
