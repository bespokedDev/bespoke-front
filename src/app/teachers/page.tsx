/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
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
import { DataTable } from "@/components/ui/data-table"; // <-- IMPORTAMOS EL NUEVO COMPONENTE
import { Plus, Pencil, Ban, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// --- Tipos y Estado Inicial (igual que antes) ---
interface PaymentData {
  _id?: string;
  bankName: string;
  accountType?: string | null;
  accountNumber?: string | null;
  holderName?: string | null;
  holderCI?: string | null;
  holderEmail?: string | null;
  holderAddress?: string | null;
  routingNumber?: string | null;
}
interface EmergencyContact {
  name?: string | null;
  phone?: string | null;
}
interface Professor {
  _id: string;
  name: string;
  ciNumber: string;
  dob: string;
  address: string;
  email: string;
  phone: string;
  occupation: string;
  startDate?: string;
  emergencyContact: EmergencyContact;
  paymentData: PaymentData[];
  isActive: boolean;
}
type ProfessorFormData = Omit<Professor, "_id" | "isActive">;
const initialProfessorState: ProfessorFormData = {
  name: "",
  ciNumber: "",
  dob: "",
  address: "",
  email: "",
  phone: "",
  occupation: "",
  startDate: "",
  emergencyContact: { name: "", phone: "" },
  paymentData: [
    {
      bankName: "",
      accountType: "",
      accountNumber: "",
      holderName: "",
      holderCI: "",
      holderEmail: "",
      holderAddress: "",
      routingNumber: "",
    },
  ],
};
const formatDateForInput = (dateString?: string | null) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toISOString().split("T")[0];
  } catch (e) {
    console.log("error: ", e)
    return "";
  }
};

// --- COMPONENTE PRINCIPAL ---
export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Professor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados del diálogo (se mantienen igual)
  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "status" | null
  >(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Professor | null>(
    null
  );
  const [formData, setFormData] = useState<Partial<ProfessorFormData>>(
    initialProfessorState
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // --- Lógica de la API (se mantiene igual) ---
  const fetchTeachers = async () => {
    /* ... (sin cambios) ... */
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient("api/professors");
      setTeachers(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch teachers.");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleOpen = (
    type: "create" | "edit" | "status",
    teacher?: Professor
  ) => {
    /* ... (sin cambios) ... */
    setDialogError(null);
    if (type === "create") {
      setSelectedTeacher(null);
      setFormData(initialProfessorState);
    } else if (teacher) {
      setSelectedTeacher(teacher);
      const { /*_id, isActive, __v,*/ ...editableData } = teacher as any;
      if (editableData.dob)
        editableData.dob = formatDateForInput(editableData.dob);
      if (editableData.startDate)
        editableData.startDate = formatDateForInput(editableData.startDate);
      setFormData(editableData);
    }
    setOpenDialog(type);
  };
  const handleClose = () => {
    /* ... (sin cambios) ... */
    setOpenDialog(null);
    setSelectedTeacher(null);
    setFormData(initialProfessorState);
    setIsSubmitting(false);
    setDialogError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    /* ... (sin cambios) ... */
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleNestedChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    parentKey: keyof ProfessorFormData,
    childKey: keyof EmergencyContact
  ) => {
    /* ... (sin cambios) ... */
    const { value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [parentKey]: { ...prev[parentKey], [childKey]: value },
    }));
  };
  const handlePaymentDataChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: keyof PaymentData
  ) => {
    /* ... (sin cambios) ... */
    const { value } = e.target;
    const updatedPaymentData = [...(formData.paymentData || [])];
    updatedPaymentData[index] = {
      ...updatedPaymentData[index],
      [field]: value,
    };
    setFormData((prev) => ({ ...prev, paymentData: updatedPaymentData }));
  };
  const addPaymentMethod = () => {
    /* ... (sin cambios) ... */
    const newPaymentData = [...(formData.paymentData || []), { bankName: "" }];
    setFormData((prev) => ({ ...prev, paymentData: newPaymentData }));
  };
  const removePaymentMethod = (index: number) => {
    /* ... (sin cambios) ... */
    const newPaymentData = (formData.paymentData || []).filter(
      (_, i) => i !== index
    );
    setFormData((prev) => ({ ...prev, paymentData: newPaymentData }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    /* ... (sin cambios) ... */
    e.preventDefault();
    setIsSubmitting(true);
    setDialogError(null);
    const payload = { ...formData };
    if (!payload.startDate) {
      delete payload.startDate;
    }
    if (
      payload.emergencyContact &&
      !payload.emergencyContact.name &&
      !payload.emergencyContact.phone
    ) {
      delete payload.emergencyContact;
    }
    try {
      if (openDialog === "create") {
        await apiClient("api/professors", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else if (openDialog === "edit" && selectedTeacher) {
        await apiClient(`api/professors/${selectedTeacher._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      await fetchTeachers();
      handleClose();
    } catch (err: any) {
      setDialogError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    /* ... (sin cambios) ... */
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    setDialogError(null);
    const action = selectedTeacher.isActive ? "deactivate" : "activate";
    try {
      await apiClient(`api/professors/${selectedTeacher._id}/${action}`, {
        method: "PATCH",
      });
      await fetchTeachers();
      handleClose();
    } catch (err: any) {
      setDialogError(err.message || "Failed to update status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- DEFINICIÓN DE COLUMNAS PARA LA TABLA REUTILIZABLE ---
  const columns = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "occupation", header: "Occupation" },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: (item: Professor) => (
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
      cell: (item: Professor) => (
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
    <div className="space-y-6 p-4 md:p-6 rounded-lg">
      <PageHeader
        title="Teachers"
        subtitle="List of all teachers registered in the academy"
      >
        <Button
          className="bg-primary text-white hover:bg-primary/90"
          onClick={() => handleOpen("create")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add teacher
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
              data={teachers}
              searchKeys={["name", "email", "phone"]}
            />
          </CardContent>
        </Card>
      )}

      {/* Los diálogos se mantienen sin cambios */}
      <Dialog
        open={openDialog !== null}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        {/* ... (todo el JSX de los diálogos se mantiene exactamente igual que antes) ... */}
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Add New Teacher"}
              {openDialog === "edit" && "Edit Teacher's Information"}
              {openDialog === "status" && `Confirm Status Change`}
            </DialogTitle>
          </DialogHeader>
          {(openDialog === "create" || openDialog === "edit") && (
            <form
              onSubmit={handleSubmit}
              className="max-h-[70vh] overflow-y-auto p-1 pr-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name || ""}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciNumber">CI Number</Label>
                  <Input
                    id="ciNumber"
                    name="ciNumber"
                    value={formData.ciNumber || ""}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone || ""}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    name="dob"
                    type="date"
                    value={formData.dob || ""}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address || ""}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    name="occupation"
                    value={formData.occupation || ""}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate || ""}
                    onChange={handleFormChange}
                  />
                </div>
                <fieldset className="md:col-span-2 border p-4 rounded-md border-light-border dark:border-dark-border">
                  <legend className="text-sm font-medium px-1 text-light-subtext dark:text-dark-subtext">
                    Emergency Contact
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyName">Name</Label>
                      <Input
                        id="emergencyName"
                        value={formData.emergencyContact?.name || ""}
                        onChange={(e) =>
                          handleNestedChange(e, "emergencyContact", "name")
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Phone</Label>
                      <Input
                        id="emergencyPhone"
                        type="tel"
                        value={formData.emergencyContact?.phone || ""}
                        onChange={(e) =>
                          handleNestedChange(e, "emergencyContact", "phone")
                        }
                      />
                    </div>
                  </div>
                </fieldset>
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-lg font-medium text-light-subtext dark:text-dark-subtext">
                    Payment Data
                  </h3>
                  {(formData.paymentData || []).map((payment, index) => (
                    <fieldset
                      key={index}
                      className="border p-4 rounded-md border-light-border dark:border-dark-border relative"
                    >
                      <legend className="text-sm font-medium px-1 text-light-subtext dark:text-dark-subtext">
                        Method {index + 1}
                      </legend>
                      {formData.paymentData &&
                        formData.paymentData.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute top-1 right-1 text-accent-1"
                            onClick={() => removePaymentMethod(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        <div className="space-y-2">
                          <Label>Bank Name</Label>
                          <Input
                            value={payment.bankName}
                            onChange={(e) =>
                              handlePaymentDataChange(e, index, "bankName")
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Type</Label>
                          <Input
                            value={payment.accountType || ""}
                            onChange={(e) =>
                              handlePaymentDataChange(e, index, "accountType")
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Number</Label>
                          <Input
                            value={payment.accountNumber || ""}
                            onChange={(e) =>
                              handlePaymentDataChange(e, index, "accountNumber")
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Holder´s Name</Label>
                          <Input
                            value={payment.holderName || ""}
                            onChange={(e) =>
                              handlePaymentDataChange(e, index, "holderName")
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Holder´s CI</Label>
                          <Input
                            value={payment.holderCI || ""}
                            onChange={(e) =>
                              handlePaymentDataChange(e, index, "holderCI")
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Holder´s Email</Label>
                          <Input
                            type="email"
                            value={payment.holderEmail || ""}
                            onChange={(e) =>
                              handlePaymentDataChange(e, index, "holderEmail")
                            }
                          />
                        </div>
                      </div>
                    </fieldset>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addPaymentMethod}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Payment Method
                  </Button>
                </div>
              </div>
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
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}{" "}
                  {openDialog === "create" ? "Create Teacher" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
          {openDialog === "status" && selectedTeacher && (
            <div>
              <DialogDescription className="text-light-text dark:text-dark-text">
                Are you sure you want to{" "}
                {selectedTeacher.isActive ? "deactivate" : "activate"} the
                teacher{" "}
                <span className="font-bold">{selectedTeacher.name}</span>?
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
                  variant={selectedTeacher.isActive ? "destructive" : "default"}
                  className={
                    !selectedTeacher.isActive
                      ? "bg-secondary hover:bg-secondary/90 text-white"
                      : ""
                  }
                  onClick={handleToggleStatus}
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {selectedTeacher.isActive ? "Deactivate" : "Activate"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
