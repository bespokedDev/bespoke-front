/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import {
  formatDateForDisplay,
  getCurrentDateString,
  extractDatePart,
} from "@/lib/dateUtils";
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
import {
  Plus,
  Pencil,
  Ban,
  CheckCircle2,
  Loader2,
  Trash2,
  Eye,
  ArrowUpDown,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

// --- DEFINICIONES DE TIPOS ---
interface Note {
  _id?: string;
  date: string;
  text: string;
}

interface Student {
  _id: string;
  studentCode: string;
  name: string;
  dob: string;
  gender: string;
  representativeName?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  occupation: string;
  status: number; // 0=inactivo, 1=activo, 2=pausa
  notes: Note[];
}

type StudentFormData = Omit<
  Student,
  | "_id"
  | "studentCode"
  | "disenrollmentDate"
  | "disenrollmentReason"
  | "createdAt"
  | "updatedAt"
  | "__v"
>;

// --- ESTADO INICIAL ---
const initialStudentState: StudentFormData = {
  name: "",
  dob: "",
  gender: "",
  representativeName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  occupation: "",
  status: 1, // Por defecto activo
  notes: [],
};

// --- FUNCIONES DE AYUDA ---
const formatDateForInput = (dateString?: string | null) => {
  if (!dateString) return "";
  try {
    return extractDatePart(dateString);
  } catch (e) {
    console.log("error: ", e);
    return "";
  }
};

// --- COMPONENTE PRINCIPAL ---
export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "status" | "view" | null
  >(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] =
    useState<Partial<StudentFormData>>(initialStudentState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");

  // --- OBTENCIÓN DE DATOS ---
  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient("api/students");
      console.log("data: ", data);
      setStudents(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch students.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // --- MANEJADORES DE DIÁLOGOS ---
  const handleOpen = (
    type: "create" | "edit" | "status" | "view",
    student?: Student
  ) => {
    setDialogError(null);
    setDeactivationReason("");
    if (type === "create") {
      setSelectedStudent(null);
      setFormData(initialStudentState);
    } else if (student) {
      setSelectedStudent(student);
      if (type === "edit") {
        const editableData = {
          ...student,
          dob: formatDateForInput(student.dob),
          notes: student.notes.map((note) => ({
            ...note,
            date: formatDateForInput(note.date),
          })),
        };
        setFormData(editableData);
      }
    }
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setSelectedStudent(null);
    setFormData(initialStudentState);
    setIsSubmitting(false);
    setDialogError(null);
  };

  // --- MANEJADORES DE FORMULARIOS ---
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSelectChange = (
    name: keyof StudentFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleNoteChange = (
    index: number,
    field: "date" | "text",
    value: string
  ) => {
    const newNotes = [...(formData.notes || [])];
    newNotes[index] = { ...newNotes[index], [field]: value };
    setFormData((prev) => ({ ...prev, notes: newNotes }));
  };
  const addNote = () => {
    const newNotes = [
      ...(formData.notes || []),
      { date: getCurrentDateString(), text: "" },
    ];
    setFormData((prev) => ({ ...prev, notes: newNotes }));
  };
  const removeNote = (index: number) => {
    const newNotes = (formData.notes || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, notes: newNotes }));
  };

  // --- ACCIONES DE LA API ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDialogError(null);
    try {
      if (openDialog === "create") {
        await apiClient("api/students", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      } else if (openDialog === "edit" && selectedStudent) {
        await apiClient(`api/students/${selectedStudent._id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
      }
      await fetchStudents();
      handleClose();
    } catch (err: any) {
      setDialogError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleToggleStatus = async () => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    setDialogError(null);

    // Cambiar entre activo (1) e inactivo (0)
    const newStatus = selectedStudent.status === 1 ? 0 : 1;
    const body: { status: number; reason?: string } = { status: newStatus };

    if (newStatus === 0 && deactivationReason) {
      body.reason = deactivationReason;
    }

    try {
      await apiClient(`api/students/${selectedStudent._id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await fetchStudents();
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

  // --- DEFINICIÓN DE COLUMNAS PARA LA TABLA ---
  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "studentCode",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Code
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Name
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Email
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Phone
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
    },
    {
      accessorKey: "status",
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
      sortingFn: stringLocaleSort(),
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
          {row.original.status === 1 ? (
            <Button
              size="icon"
              variant="outline"
              className="text-accent-1 border-accent-1/50 hover:bg-accent-1/10"
              onClick={() => handleOpen("status", row.original)}
            >
              <Ban className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              className="text-secondary border-secondary/50 hover:bg-secondary/10"
              onClick={() => handleOpen("status", row.original)}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <div className="space-y-6">
      <PageHeader title="Students" subtitle="Manage all enrolled students">
        <Button
          className="bg-primary text-white hover:bg-primary/90"
          onClick={() => handleOpen("create")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add student
        </Button>
      </PageHeader>

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && <p className="text-accent-1 text-center">{error}</p>}

      {!isLoading && !error && (
        <Card className=" border-none">
          <CardContent>
            <DataTable
              columns={columns}
              data={students}
              searchKeys={["studentCode", "name", "email"]}
              searchPlaceholder="Search by code, name, or email..."
            />
          </CardContent>
        </Card>
      )}

      {/* --- DIÁLOGOS --- */}
      <Dialog
        open={openDialog !== null}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Add New Student"}
              {openDialog === "edit" && "Edit Student's Information"}
              {openDialog === "view" && "Student Details"}
              {openDialog === "status" && `Confirm Status Change`}
            </DialogTitle>
          </DialogHeader>

          {(openDialog === "create" || openDialog === "edit") && (
            <form
              onSubmit={handleSubmit}
              className="max-h-[70vh] overflow-y-auto p-1 pr-4 space-y-6"
            >
              <fieldset className="border p-4 rounded-md">
                <legend className="px-1 text-sm">Personal Info</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      name="name"
                      value={formData.name || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      name="dob"
                      type="date"
                      value={formData.dob || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      name="gender"
                      onValueChange={(v) => handleSelectChange("gender", v)}
                      value={formData.gender || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Representative</Label>
                    <Input
                      name="representativeName"
                      value={formData.representativeName || ""}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Occupation</Label>
                    <Input
                      name="occupation"
                      value={formData.occupation || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      name="status"
                      onValueChange={(v) =>
                        handleSelectChange("status", parseInt(v))
                      }
                      value={formData.status?.toString() || "1"}
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
                </div>
              </fieldset>
              <fieldset className="border p-4 rounded-md">
                <legend className="px-1 text-sm">Contact & Address</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      name="phone"
                      type="tel"
                      value={formData.phone || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address</Label>
                    <Input
                      name="address"
                      value={formData.address || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      name="city"
                      value={formData.city || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      name="country"
                      value={formData.country || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </div>
              </fieldset>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notes</h3>
                {(formData.notes || []).map((note, index) => (
                  <fieldset
                    key={note._id || index}
                    className="border p-4 rounded-md relative"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={note.date}
                          onChange={(e) =>
                            handleNoteChange(index, "date", e.target.value)
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Note</Label>
                        <Textarea
                          value={note.text}
                          onChange={(e) =>
                            handleNoteChange(index, "text", e.target.value)
                          }
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute top-1 right-1 text-accent-1 hover:bg-accent-1/10"
                      onClick={() => removeNote(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </fieldset>
                ))}
                <Button type="button" variant="outline" onClick={addNote}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
              <DialogFooter className="pt-4 border-t">
                <p className="text-sm text-accent-1 mr-auto">{dialogError}</p>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}{" "}
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}

          {openDialog === "status" && selectedStudent && (
            <div>
              <DialogDescription className="text-light-text dark:text-dark-text">
                <p>
                  Are you sure you want to{" "}
                  {selectedStudent.status === 1 ? "deactivate" : "activate"}{" "}
                  <span className="font-bold">{selectedStudent.name}</span>?
                </p>
                {selectedStudent.status === 1 && (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="reason">
                      Reason for deactivation (optional)
                    </Label>
                    <Input
                      id="reason"
                      value={deactivationReason}
                      onChange={(e) => setDeactivationReason(e.target.value)}
                      placeholder="e.g., Moved to another city"
                    />
                  </div>
                )}
              </DialogDescription>
              <DialogFooter className="mt-6">
                <p className="text-sm text-accent-1 mr-auto">{dialogError}</p>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant={
                    selectedStudent.status === 1 ? "destructive" : "default"
                  }
                  className={
                    selectedStudent.status !== 1
                      ? "bg-secondary hover:bg-secondary/90 text-white"
                      : ""
                  }
                  onClick={handleToggleStatus}
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}{" "}
                  {selectedStudent.status === 1 ? "Deactivate" : "Activate"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {openDialog === "view" && selectedStudent && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <Label className="font-semibold">Student Code</Label>
                  <p className="text-sm font-semibold">
                    {selectedStudent.studentCode}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Full Name</Label>
                  <p className="text-sm font-semibold">
                    {selectedStudent.name}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Date of Birth</Label>
                  <p className="text-sm">
                    {selectedStudent.dob
                      ? formatDateForDisplay(selectedStudent.dob)
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Gender</Label>
                  <p className="text-sm">{selectedStudent.gender || "N/A"}</p>
                </div>
                <div>
                  <Label className="font-semibold">Representative</Label>
                  <p className="text-sm">
                    {selectedStudent.representativeName || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Occupation</Label>
                  <p className="text-sm">
                    {selectedStudent.occupation || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Email</Label>
                  <p className="text-sm">{selectedStudent.email}</p>
                </div>
                <div>
                  <Label className="font-semibold">Phone</Label>
                  <p className="text-sm">{selectedStudent.phone}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="font-semibold">Address</Label>
                  <p className="text-sm">{selectedStudent.address}</p>
                </div>
                <div>
                  <Label className="font-semibold">City</Label>
                  <p className="text-sm">{selectedStudent.city}</p>
                </div>
                <div>
                  <Label className="font-semibold">Country</Label>
                  <p className="text-sm">{selectedStudent.country}</p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedStudent.status === 1
                        ? "bg-secondary/20 text-secondary"
                        : selectedStudent.status === 0
                        ? "bg-accent-1/20 text-accent-1"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedStudent.status === 1
                      ? "Active"
                      : selectedStudent.status === 0
                      ? "Inactive"
                      : "Paused"}
                  </span>
                </div>
              </div>

              {selectedStudent.notes && selectedStudent.notes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Notes</h3>
                  {selectedStudent.notes.map((note, index) => (
                    <div
                      key={note._id || index}
                      className="border p-4 rounded-md"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">
                            Date
                          </Label>
                          <p className="text-sm font-semibold">
                            {note.date
                              ? formatDateForDisplay(note.date)
                              : "N/A"}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm text-muted-foreground">
                            Note
                          </Label>
                          <p className="text-sm">{note.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
