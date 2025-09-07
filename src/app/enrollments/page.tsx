/* eslint-disable @typescript-eslint/no-explicit-any */ "use client";
import { useState, useEffect, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatDateForDisplay, getCurrentDateString, extractDatePart } from "@/lib/dateUtils";
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
  Eye,
} from "lucide-react";

// --- DEFINICIONES DE TIPOS ---
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

interface ScheduledDay {
  _id?: string;
  day: string;
}

interface Enrollment {
  _id: string;
  planId: Plan;
  studentIds: StudentBrief[];
  professorId?: ProfessorBrief | null;
  enrollmentType: "single" | "couple" | "group";
  scheduledDays: ScheduledDay[] | null;
  purchaseDate: string;
  startDate?: string;
  pricePerStudent: number;
  totalAmount: number;
  status: number; // 1=activo, 0=inactivo, 2=pausado
  alias?: string; // 👈 NUEVO
  language?: string; // 👈 NUEVO
}

type EnrollmentWithSearch = Enrollment & {
  searchableString: string;
};

type EnrollmentFormData = {
  planId: string;
  studentIds: string[];
  professorId?: string;
  enrollmentType: "single" | "couple" | "group";
  scheduledDays: string[];
  purchaseDate: string;
  startDate?: string;
  pricePerStudent: number;
  totalAmount: number;
  status?: number;
  alias?: string; // 👈 NUEVO
  language?: string; // 👈 NUEVO
};

// --- ESTADO INICIAL ---
const initialEnrollmentState: EnrollmentFormData = {
  planId: "",
  studentIds: [],
  professorId: "",
  enrollmentType: "single",
  scheduledDays: [],
  purchaseDate: getCurrentDateString(),
  startDate: getCurrentDateString(),
  pricePerStudent: 0,
  totalAmount: 0,
  alias: "", // 👈 NUEVO
  language: "", // 👈 NUEVO
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
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [students, setStudents] = useState<StudentBrief[]>([]);
  const [professors, setProfessors] = useState<ProfessorBrief[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "status" | "view" | null
  >(null);
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<Enrollment | null>(null);
  const [formData, setFormData] = useState<EnrollmentFormData>(
    initialEnrollmentState
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

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
        // Handle API response structure for plans
        setPlans(planData.plans || planData || []);
        setStudents(studentData);
        const sortedProfessors = professorData.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setProfessors(sortedProfessors);
      } catch (err: any) {
        setError(err.message || "Failed to fetch data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!plans || !Array.isArray(plans)) return;
    const selectedPlan = plans.find((p) => p._id === formData.planId);
    if (!selectedPlan) return;

    let pricePerStudent = 0;
    let enrollmentType: "single" | "couple" | "group" = "group";

    if (formData.studentIds.length === 1) {
      pricePerStudent = selectedPlan.pricing.single;
      enrollmentType = "single";
    } else if (formData.studentIds.length === 2) {
      pricePerStudent = selectedPlan.pricing.couple / 2;
      enrollmentType = "couple";
    } else if (formData.studentIds.length > 2) {
      pricePerStudent = selectedPlan.pricing.group / formData.studentIds.length;
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

  const handleOpen = (
    type: "create" | "edit" | "status" | "view",
    enrollment?: Enrollment
  ) => {
    setDialogError(null);
    if (type === "create") {
      setSelectedEnrollment(null);
      setFormData(initialEnrollmentState);
    } else if (enrollment) {
      setSelectedEnrollment(enrollment);
      if (type === "edit") {
        const scheduledDaysArray =
          enrollment.scheduledDays?.map((d) => d.day) || [];
        setFormData({
          planId: enrollment.planId._id,
          studentIds: enrollment.studentIds.map((s) => s._id),
          professorId: enrollment.professorId?._id || "",
          enrollmentType: enrollment.enrollmentType,
          scheduledDays: scheduledDaysArray,
          purchaseDate: extractDatePart(enrollment.purchaseDate),
          startDate: enrollment.startDate
            ? extractDatePart(enrollment.startDate)
            : getCurrentDateString(),
          pricePerStudent: enrollment.pricePerStudent,
          totalAmount: enrollment.totalAmount,
          status: enrollment.status,
          alias: enrollment.alias || "", // 👈 NUEVO
          language: enrollment.language || "", // 👈 NUEVO
        });
      }
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
    const payload = {
      ...formData,
      scheduledDays:
        formData.scheduledDays.length > 0
          ? formData.scheduledDays.map((day) => ({ day }))
          : [],
      status: openDialog === "create" ? 1 : formData.status,
    };
    console.log("EL STATTUSSS", formData.status, openDialog);
    console.log("EL PAYLLOOAAADDD", payload);
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

    try {
      // Determinar si está activo o inactivo basado en status
      const action =
        selectedEnrollment.status === 1 ? "deactivate" : "activate";

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

  const columns: ColumnDef<Enrollment>[] = [
    // Alias o lista de estudiantes (string plano)
    {
      id: "aliasOrStudents",
      accessorFn: (row) =>
        row.alias?.trim() ||
        row.studentIds.map((s: { name: string }) => s.name).join(", "),
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Alias / Students
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(), // 👈 orden alfabético real
      cell: ({ row }) => {
        const alias = row.original.alias;
        return alias?.trim()
          ? alias
          : row.original.studentIds.map((s) => s.name).join(", ");
      },
    },
    // Language
    {
      id: "language",
      accessorFn: (row) => row.language || "N/A",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Language
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => row.original.language || "N/A",
    },
    // Plan + tipo (string plano)
    {
      id: "planWithType",
      accessorFn: (row) => {
        const planName = row.planId.name;
        const type =
          row.enrollmentType === "single"
            ? "Single"
            : row.enrollmentType === "couple"
            ? "Couple"
            : "Group";
        return `${type} - ${planName}`;
      },
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Plan
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(), // 👈 orden alfabético real
      cell: ({ row }) => {
        const planName = row.original.planId.name;
        const t = row.original.enrollmentType;
        const type =
          t === "single" ? "Single" : t === "couple" ? "Couple" : "Group";
        return (
          <div>
            {type} - {planName}
          </div>
        );
      },
    },

    // Profesor (string plano)
    {
      id: "professor",
      accessorFn: (row) => row.professorId?.name || "N/A",
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
      sortingFn: stringLocaleSort(), // 👈 orden alfabético real
      cell: ({ row }) => row.original.professorId?.name || "N/A",
    },

    // Status (si prefieres alfabético, lo exponemos como texto)
    {
      id: "statusText",
      accessorFn: (row) =>
        row.status === 1 ? "Active" : row.status === 0 ? "Inactive" : "Paused",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Status
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(), // 👈 alfabético
      cell: ({ row }) => {
        const status = row.original.status;
        const statusText =
          status === 1 ? "Active" : status === 0 ? "Inactive" : "Paused";
        const statusClass =
          status === 1
            ? "bg-secondary/20 text-secondary"
            : status === 0
            ? "bg-accent-1/20 text-accent-1"
            : "bg-yellow-100 text-yellow-800";
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}
          >
            {statusText}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
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
            onClick={() => handleOpen("status", row.original)}
          >
            {row.original.status === 1 ? (
              <Ban className="h-4 w-4 text-accent-1" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-secondary" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
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
        <Card className="border-none">
          <CardContent>
            <DataTable
              columns={columns}
              data={enrollments}
              searchKeys={["aliasOrStudents", "language", "planWithType", "professor", "statusText"]}
              searchPlaceholder="Search enrollments..."
            />
          </CardContent>
        </Card>
      )}

      <Dialog
        open={
          openDialog === "create" ||
          openDialog === "edit" ||
          openDialog === "view"
        }
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Create Enrollment"}
              {openDialog === "edit" && "Edit Enrollment"}
              {openDialog === "view" && "Enrollment Details"}
            </DialogTitle>
          </DialogHeader>

          {(openDialog === "create" || openDialog === "edit") && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {(formData.enrollmentType === "couple" ||
                formData.enrollmentType === "group") && (
                <div className="space-y-2">
                  <Label>Alias</Label>
                  <Input
                    type="text"
                    value={formData.alias || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, alias: e.target.value }))
                    }
                    placeholder="Enter alias..."
                    maxLength={100}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={formData.language || ""}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, language: v }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        purchaseDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.startDate || ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        startDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              {openDialog === "edit" && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status?.toString() || ""}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, status: parseInt(v) }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Active</SelectItem>
                      <SelectItem value="0">Inactive</SelectItem>
                      <SelectItem value="2">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
          )}

          {openDialog === "view" && selectedEnrollment && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {(selectedEnrollment.enrollmentType === "couple" ||
                  selectedEnrollment.enrollmentType === "group") && (
                  <div>
                    <Label className="font-semibold">Alias</Label>
                    <p className="text-sm">
                      {selectedEnrollment.alias || "N/A"}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="font-semibold">Students</Label>
                  <p className="text-sm">
                    {selectedEnrollment.studentIds
                      .map((s) => s.name)
                      .join(", ")}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Plan</Label>
                  <p className="text-sm">{selectedEnrollment.planId.name}</p>
                </div>
                <div>
                  <Label className="font-semibold">Professor</Label>
                  <p className="text-sm">
                    {selectedEnrollment.professorId?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Purchase Date</Label>
                  <p className="text-sm">
                    {formatDateForDisplay(selectedEnrollment.purchaseDate)}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedEnrollment.status === 1
                        ? "bg-secondary/20 text-secondary"
                        : selectedEnrollment.status === 0
                        ? "bg-accent-1/20 text-accent-1"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedEnrollment.status === 1
                      ? "Active"
                      : selectedEnrollment.status === 0
                      ? "Inactive"
                      : "Paused"}
                  </span>
                </div>
                <div>
                  <Label className="font-semibold">Start Date</Label>
                  <p className="text-sm">
                    {selectedEnrollment.startDate
                      ? formatDateForDisplay(selectedEnrollment.startDate)
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Scheduled Days</Label>
                  <p className="text-sm">
                    {selectedEnrollment.scheduledDays
                      ?.map((d) => d.day)
                      .join(", ") || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Language</Label>
                  <p className="text-sm">
                    {selectedEnrollment.language || "N/A"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 p-4 border rounded-md bg-muted/30">
                <div>
                  <Label className="font-semibold">Enrollment Type</Label>
                  <p className="font-semibold capitalize">
                    {selectedEnrollment.enrollmentType}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Price per Student</Label>
                  <p className="font-semibold">
                    ${selectedEnrollment.pricePerStudent.toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Total Amount</Label>
                  <p className="font-semibold">
                    ${selectedEnrollment.totalAmount.toFixed(2)}
                  </p>
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
        open={openDialog === "status"}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to{" "}
            {selectedEnrollment?.status === 1 ? "deactivate" : "activate"} this
            enrollment?
          </DialogDescription>
          <DialogFooter>
            <p className="text-sm text-accent-1 mr-auto">{dialogError}</p>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant={
                selectedEnrollment?.status === 1 ? "destructive" : "default"
              }
              onClick={handleToggleStatus}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}{" "}
              {selectedEnrollment?.status === 1 ? "Deactivate" : "Activate"}
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
                        e.stopPropagation();
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
