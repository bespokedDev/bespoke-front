/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
import { Textarea } from "@/components/ui/textarea"; // Importar Textarea
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Ban, CheckCircle2, Loader2, FileDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- DEFINICIONES DE TIPOS ---
interface PaymentMethod {
  _id: string;
  bankName: string;
  accountType?: string | null;
  accountNumber?: string | null;
  holderName?: string | null;
  holderCI?: string | null;
  holderEmail?: string | null;
}
interface Professor {
  _id: string;
  name: string;
  paymentData: PaymentMethod[];
  email?: string;
  phone?: string;
  typeId?: {
    rates: { single: number; couple: number; group: number };
  };
}
interface Enrollment {
  _id: string;
  studentIds: Array<{ _id: string; name: string }>;
  planId: { name: string };
  professorId: string;
  isActive: boolean;
  enrollmentType: "single" | "couple" | "group";
}
interface PayoutDetailInput {
  enrollmentId: string;
  hoursTaught: number;
  payPerHour: number;
  totalPerEnrollment: number;
}
interface Payout {
  _id: string;
  professorId: Professor;
  month: string;
  details: Array<{
    enrollmentId: Enrollment;
    hoursTaught: number;
    totalPerStudent: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethodId: PaymentMethod | null;
  paidAt: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}
type PayoutFormData = {
  professorId: string;
  month: string;
  details: PayoutDetailInput[];
  discount: number;
  paymentMethodId: string;
  paidAt: string;
  notes?: string; // Añadido campo de notas
};

// --- ESTADO INICIAL ---
const initialPayoutState: PayoutFormData = {
  professorId: "",
  month: `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`,
  details: [],
  discount: 0,
  paymentMethodId: "",
  paidAt: new Date().toISOString().split("T")[0],
  notes: "", // Añadido campo de notas
};

// --- GENERADOR DE PDF (MODIFICADO) ---
const generatePayoutPDF = (payout: Payout) => {
  const doc = new jsPDF();
  const paidDate = new Date(payout.paidAt).toLocaleDateString();
  const generationDate = new Date(payout.createdAt).toLocaleDateString();
  const professor = payout.professorId;
  const paymentMethod = payout.paymentMethodId;
  const payoutCode = payout._id.slice(-6).toUpperCase();

  doc.setFontSize(20);
  doc.text("Payout Receipt", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Payout Code: ${payoutCode}`, 105, 26, { align: "center" });

  autoTable(doc, {
    startY: 35,
    body: [
      [
        { content: "Professor Details", styles: { fontStyle: "bold" } },
        { content: "Payment Details", styles: { fontStyle: "bold" } },
      ],
      [
        `Name: ${professor.name || "N/A"}`,
        `Generation Date: ${generationDate}`,
      ],
      [`Email: ${professor.email || "N/A"}`, `Paid On: ${paidDate}`],
      [`Phone: ${professor.phone || "N/A"}`, `Payment Month: ${payout.month}`],
    ],
    theme: "plain",
    styles: { fontSize: 9 },
  });
  let finalY = (doc as any).lastAutoTable.finalY + 5;

  doc.setFontSize(12);
  finalY += 6;

  const breakdownColumns = [
    "Students & Plan",
    "Type",
    "Pay/Hour",
    "Hours",
    "Total",
  ];
  const breakdownRows: any[] = [];
  payout.details.forEach((detail) => {
    if (!detail.enrollmentId) return;
    const students = detail.enrollmentId.studentIds
      .map((s) => s.name)
      .join(", ");
    const plan = detail.enrollmentId.planId.name;
    const type = detail.enrollmentId.enrollmentType;
    const payPerHour =
      detail.hoursTaught > 0 ? detail.totalPerStudent / detail.hoursTaught : 0;
    const row = [
      `${students} (${plan})`,
      type,
      `$${payPerHour.toFixed(2)}`,
      detail.hoursTaught,
      `$${detail.totalPerStudent.toFixed(2)}`,
    ];
    breakdownRows.push(row);
  });
  autoTable(doc, {
    head: [breakdownColumns],
    body: breakdownRows,
    startY: finalY,
    headStyles: {
      fillColor: "#4C549E", // Color primario de tu tema
    },
  });
  finalY = (doc as any).lastAutoTable.finalY;

  const summaryX = 140;
  doc.setFontSize(10);
  doc.text(`Subtotal:`, summaryX, finalY + 10, { align: "right" });
  doc.text(`$${payout.subtotal.toFixed(2)}`, 190, finalY + 10, {
    align: "right",
  });
  doc.text(`Discount:`, summaryX, finalY + 16, { align: "right" });
  doc.text(`-$${payout.discount.toFixed(2)}`, 190, finalY + 16, {
    align: "right",
  });
  doc.setFont("helvetica", "bold");
  doc.text(`Total Paid:`, summaryX, finalY + 22, { align: "right" });
  doc.text(`$${payout.total.toFixed(2)}`, 190, finalY + 22, { align: "right" });
  finalY += 30;

  if (paymentMethod) {
    doc.setFontSize(10);
    doc.text("Paid to Account", 14, finalY);
    finalY += 2;
    autoTable(doc, {
      head: [
        ["Account Name", "Confirmation #", "Paid On", "Received By", "Date"],
      ],
      headStyles: {
        fillColor: "#4C549E", // Color primario de tu tema
      },
      body: [[`${paymentMethod.bankName}`, "", paidDate, "", paidDate]],
      startY: finalY,
    });
    finalY = (doc as any).lastAutoTable.finalY;
  }

  if (payout.notes) {
    finalY += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Notes:", 14, finalY);
    finalY += 6;
    doc.setFontSize(10);
    const notesText = doc.splitTextToSize(payout.notes, 180);
    doc.text(notesText, 14, finalY);
    finalY += notesText.length * 5;
  }

  doc.setFontSize(10);
  doc.line(190, finalY + 20, 130, finalY + 20);
  doc.text("Signature", 170, finalY + 25, { align: "right" });

  doc.save(
    `payout_${payout.professorId.name.replace(" ", "_")}_${payout.month}.pdf`
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [professorEnrollments, setProfessorEnrollments] = useState<
    Enrollment[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrollmentsLoading, setIsEnrollmentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<"create" | "status" | null>(
    null
  );
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [formData, setFormData] = useState<PayoutFormData>(initialPayoutState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [payoutData, professorData] = await Promise.all([
          apiClient("api/payouts"),
          apiClient("api/professors"),
        ]);
        console.log("LA DATAAAAA", payoutData);
        setPayouts(payoutData);
        setProfessors(professorData);
      } catch (err: any) {
        setError(err.message || "Failed to fetch data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchAndProcessEnrollments = async () => {
      if (!formData.professorId) {
        setProfessorEnrollments([]);
        return;
      }
      setIsEnrollmentsLoading(true);
      try {
        const enrollmentsData = await apiClient(
          `api/enrollments/professor/${formData.professorId}`
        );
        const professorData = await apiClient(
          `api/professors/${formData.professorId}`
        );
        setProfessorEnrollments(enrollmentsData);
        const initialDetails = enrollmentsData.map((enrollment: Enrollment) => {
          const rates = professorData.typeId?.rates;
          let payPerHour = 0;
          if (rates) {
            switch (enrollment.enrollmentType) {
              case "single":
                payPerHour = rates.single;
                break;
              case "couple":
                payPerHour = rates.couple;
                break;
              case "group":
                payPerHour = rates.group;
                break;
              default:
                payPerHour = 0;
            }
          }
          return {
            enrollmentId: enrollment._id,
            hoursTaught: 0,
            payPerHour: payPerHour,
            totalPerEnrollment: 0,
          };
        });
        setFormData((prev) => ({ ...prev, details: initialDetails }));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err: any) {
        setDialogError("Could not fetch data for this professor.");
        setProfessorEnrollments([]);
      } finally {
        setIsEnrollmentsLoading(false);
      }
    };
    fetchAndProcessEnrollments();
  }, [formData.professorId]);

  const { subtotal, total } = useMemo(() => {
    const sub = formData.details.reduce(
      (acc, detail) => acc + (detail.totalPerEnrollment || 0),
      0
    );
    return { subtotal: sub, total: sub - (formData.discount || 0) };
  }, [formData.details, formData.discount]);

  const selectedPaymentMethod = useMemo(() => {
    const professor = professors.find((p) => p._id === formData.professorId);
    if (!professor) return null;
    return (
      professor.paymentData.find((pm) => pm._id === formData.paymentMethodId) ||
      null
    );
  }, [formData.professorId, formData.paymentMethodId, professors]);

  const handleOpen = (type: "create" | "status", payout?: Payout) => {
    setDialogError(null);
    if (type === "create") {
      setSelectedPayout(null);
      setFormData(initialPayoutState);
      setProfessorEnrollments([]);
    } else if (payout) {
      setSelectedPayout(payout);
    }
    setOpenDialog(type);
  };
  const handleClose = () => {
    setOpenDialog(null);
  };

  const handleDetailChange = (
    enrollmentId: string,
    field: "hoursTaught" | "payPerHour",
    value: number
  ) => {
    let newDetails = [...formData.details];
    let detail = newDetails.find((d) => d.enrollmentId === enrollmentId);
    if (!detail) return;
    newDetails = newDetails.map((d) =>
      d.enrollmentId === enrollmentId ? { ...d } : d
    );
    detail = newDetails.find((d) => d.enrollmentId === enrollmentId)!;
    if (field === "hoursTaught") detail.hoursTaught = value;
    else if (field === "payPerHour") detail.payPerHour = value;
    detail.totalPerEnrollment = detail.hoursTaught * (detail.payPerHour || 0);
    setFormData((prev) => ({ ...prev, details: newDetails }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setDialogError(null);
    const payload = {
      ...formData,
      details: formData.details
        .filter((d) => d.hoursTaught > 0)
        .map((detail) => ({
          enrollmentId: detail.enrollmentId,
          hoursTaught: detail.hoursTaught,
          totalPerStudent: detail.totalPerEnrollment,
        })),
    };
    console.log("PA CREAAAARRR", payload);
    try {
      const response = await apiClient("api/payouts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const newPayout = await apiClient(`api/payouts/${response.payout._id}`);
      generatePayoutPDF(newPayout);
      const payoutData = await apiClient("api/payouts");
      setPayouts(payoutData);
      handleClose();
    } catch (err: any) {
      setDialogError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedPayout) return;
    setIsSubmitting(true);
    setDialogError(null);
    const action = selectedPayout.isActive ? "deactivate" : "activate";
    try {
      await apiClient(`api/payouts/${selectedPayout._id}/${action}`, {
        method: "PATCH",
      });
      const payoutData = await apiClient("api/payouts");
      setPayouts(payoutData);
      handleClose();
    } catch (err: any) {
      setDialogError(err.message || "Failed to update status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: "Professor",
      accessorKey: "professorId",
      cell: (item: Payout) => item.professorId?.name || "N/A",
    },
    { header: "Month", accessorKey: "month" },
    {
      header: "Total Paid",
      accessorKey: "total",
      cell: (item: Payout) => `$${item.total.toFixed(2)}`,
    },
    {
      header: "Date Paid",
      accessorKey: "paidAt",
      cell: (item: Payout) => new Date(item.paidAt).toLocaleDateString(),
    },
    {
      header: "Status",
      accessorKey: "isActive",
      cell: (item: Payout) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            item.isActive
              ? "bg-secondary/20 text-secondary"
              : "bg-accent-1/20 text-accent-1"
          }`}
        >
          {item.isActive ? "Paid" : "Voided"}
        </span>
      ),
    },
    {
      header: "Actions",
      accessorKey: "_id",
      cell: (item: Payout) => (
        <div className="flex gap-2">
          <Button
            title="Download Receipt"
            size="icon"
            variant="outline"
            onClick={() => generatePayoutPDF(item)}
          >
            <FileDown className="h-4 w-4" />
          </Button>
          <Button
            title={item.isActive ? "Void Payout" : "Re-activate Payout"}
            size="icon"
            variant="outline"
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

  return (
    <div className="space-y-6 bg-light-background dark:bg-dark-background p-4 md:p-6 rounded-lg">
      <PageHeader
        title="Payouts"
        subtitle="Manage professor payments and salaries"
      >
        <Button
          className="bg-primary text-white hover:bg-primary/90"
          onClick={() => handleOpen("create")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Payout
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
              data={payouts}
              searchKeys={[]}
              searchPlaceholder="Search..."
            />
          </CardContent>
        </Card>
      )}
      <Dialog
        open={openDialog === "create"}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New Payout</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4"
          >
            <fieldset className="border p-4 rounded-md">
              <legend className="px-1 text-sm">Professor and Period</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <Label>Professor</Label>
                  <Select
                    value={formData.professorId}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        professorId: v,
                        details: [],
                        paymentMethodId: "",
                      }))
                    }
                    required
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
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Input
                    type="month"
                    value={formData.month}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, month: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
            </fieldset>
            {formData.professorId && (
              <fieldset className="border p-4 rounded-md">
                <legend className="px-1 text-sm">Payout Details</legend>
                {isEnrollmentsLoading ? (
                  <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Enrollment</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Hours Taught</TableHead>
                        <TableHead>Pay/Hour</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {professorEnrollments.length > 0 ? (
                        professorEnrollments.map((enr) => {
                          const detail = formData.details.find(
                            (d) => d.enrollmentId === enr._id
                          );
                          return (
                            <TableRow key={enr._id}>
                              <TableCell>
                                {enr.studentIds.map((s) => s.name).join(", ")} (
                                {enr.planId.name})
                              </TableCell>
                              <TableCell className="capitalize">
                                {enr.enrollmentType}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className="w-20"
                                  min="0"
                                  onChange={(e) =>
                                    handleDetailChange(
                                      enr._id,
                                      "hoursTaught",
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  className="w-20"
                                  min="0"
                                  step="0.01"
                                  value={detail?.payPerHour || ""}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      enr._id,
                                      "payPerHour",
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                ${(detail?.totalPerEnrollment || 0).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-24">
                            This professor has no active enrollments.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </fieldset>
            )}
            <fieldset className="border p-4 rounded-md">
              <legend className="px-1 text-sm">Summary and Payment</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Discount</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.discount}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          discount: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={formData.paymentMethodId}
                      onValueChange={(v) =>
                        setFormData((p) => ({ ...p, paymentMethodId: v }))
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment method..." />
                      </SelectTrigger>
                      <SelectContent>
                        {professors
                          .find((p) => p._id === formData.professorId)
                          ?.paymentData.map((pm) => (
                            <SelectItem key={pm._id} value={pm._id}>
                              {pm.bankName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {selectedPaymentMethod && (
                      <div className="text-xs p-3 bg-muted/50 rounded-md space-y-1 mt-2 border">
                        <p>
                          <strong>Holder:</strong>{" "}
                          {selectedPaymentMethod.holderName}
                        </p>
                        <p>
                          <strong>Account:</strong>{" "}
                          {selectedPaymentMethod.accountNumber}
                        </p>
                        <p>
                          <strong>Type:</strong>{" "}
                          {selectedPaymentMethod.accountType}
                        </p>
                        <p>
                          <strong>Email:</strong>{" "}
                          {selectedPaymentMethod.holderEmail}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Date Paid</Label>
                    <Input
                      type="date"
                      value={formData.paidAt}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, paidAt: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-md space-y-2 flex flex-col justify-center">
                  <div className="flex justify-between">
                    <p>Subtotal:</p>
                    <p>${subtotal.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between text-accent-1">
                    <p>Discount:</p>
                    <p>- ${formData.discount.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <p>Total to Pay:</p>
                    <p>${total.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </fieldset>
            <fieldset className="border p-4 rounded-md">
              <legend className="px-1 text-sm">Notes (Optional)</legend>
              <div className="mt-2">
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="w-full h-20 p-2 border rounded-md bg-transparent"
                  placeholder="Add any relevant notes for this payout..."
                />
              </div>
            </fieldset>
            <DialogFooter className="pt-4 border-t">
              <p className="text-sm text-accent-1 mr-auto">{dialogError}</p>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || total <= 0}>
                Create Payout & Download PDF
              </Button>
            </DialogFooter>
          </form>
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
            {selectedPayout?.isActive ? "void" : "re-activate"} this payout?
          </DialogDescription>
          <DialogFooter>
            <p className="text-sm text-accent-1 mr-auto">{dialogError}</p>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant={selectedPayout?.isActive ? "destructive" : "default"}
              onClick={handleToggleStatus}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {selectedPayout?.isActive ? "Void Payout" : "Re-activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
