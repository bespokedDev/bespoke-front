// En: app/students/page.tsx
"use client";

import { useState, useEffect } from "react";
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
import { Plus, Pencil, Ban, CheckCircle2, Loader2, Trash2 } from "lucide-react";

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
  enrollmentDate: string;
  language: string;
  startDate: string;
  status: string;
  notes: Note[];
  isActive: boolean;
}

type StudentFormData = Omit<
  Student,
  | "_id"
  | "isActive"
  | "disenrollmentDate"
  | "disenrollmentReason"
  | "createdAt"
  | "updatedAt"
  | "__v"
>;

// --- ESTADO INICIAL ---
const initialStudentState: StudentFormData = {
  studentCode: "",
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
  enrollmentDate: "",
  language: "",
  startDate: "",
  status: "",
  notes: [],
};

// --- FUNCIONES DE AYUDA ---
const formatDateForInput = (dateString?: string | null) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
};

// --- COMPONENTE PRINCIPAL ---
export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "status" | null
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
    type: "create" | "edit" | "status",
    student?: Student
  ) => {
    setDialogError(null);
    setDeactivationReason("");
    if (type === "create") {
      setSelectedStudent(null);
      setFormData(initialStudentState);
    } else if (student) {
      setSelectedStudent(student);
      const editableData = {
        ...student,
        dob: formatDateForInput(student.dob),
        enrollmentDate: formatDateForInput(student.enrollmentDate),
        startDate: formatDateForInput(student.startDate),
        notes: student.notes.map((note) => ({
          ...note,
          date: formatDateForInput(note.date),
        })),
      };
      setFormData(editableData);
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
  const handleSelectChange = (name: keyof StudentFormData, value: string) => {
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
      { date: new Date().toISOString().split("T")[0], text: "" },
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
    const action = selectedStudent.isActive ? "deactivate" : "activate";
    const body: { reason?: string } = {};
    if (action === "deactivate" && deactivationReason) {
      body.reason = deactivationReason;
    }
    try {
      await apiClient(`api/students/${selectedStudent._id}/${action}`, {
        method: "PATCH",
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      });
      await fetchStudents();
      handleClose();
    } catch (err: any) {
      setDialogError(err.message || "Failed to update status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- DEFINICIÓN DE COLUMNAS PARA LA TABLA ---
  const columns = [
    { accessorKey: "studentCode", header: "Code" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "status", header: "Course Status" },
    {
      accessorKey: "isActive",
      header: "System Status",
      cell: (item: Student) => (
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
      accessorKey: "_id",
      header: "Actions",
      cell: (item: Student) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            className="text-primary border-primary/50 hover:bg-primary/10"
            onClick={() => handleOpen("edit", item)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {item.isActive ? (
            <Button
              size="icon"
              variant="outline"
              className="text-accent-1 border-accent-1/50 hover:bg-accent-1/10"
              onClick={() => handleOpen("status", item)}
            >
              <Ban className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              className="text-secondary border-secondary/50 hover:bg-secondary/10"
              onClick={() => handleOpen("status", item)}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ] as const;

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <div className="space-y-6  p-4 md:p-6 rounded-lg">
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
          <CardContent className="pt-6">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label>Student Code</Label>
                    <Input
                      name="studentCode"
                      value={formData.studentCode || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
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
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
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
              <fieldset className="border p-4 rounded-md">
                <legend className="px-1 text-sm">Academic Info</legend>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label>Enrollment Date</Label>
                    <Input
                      name="enrollmentDate"
                      type="date"
                      value={formData.enrollmentDate || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      name="startDate"
                      type="date"
                      value={formData.startDate || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Input
                      name="language"
                      value={formData.language || ""}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Input
                      name="status"
                      value={formData.status || ""}
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
                  {selectedStudent.isActive ? "deactivate" : "activate"}{" "}
                  <span className="font-bold">{selectedStudent.name}</span>?
                </p>
                {selectedStudent.isActive && (
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
                  variant={selectedStudent.isActive ? "destructive" : "default"}
                  className={
                    !selectedStudent.isActive
                      ? "bg-secondary hover:bg-secondary/90 text-white"
                      : ""
                  }
                  onClick={handleToggleStatus}
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}{" "}
                  {selectedStudent.isActive ? "Deactivate" : "Activate"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
