/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import {
  Plus,
  Pencil,
  Ban,
  Eye,
  ArrowUpDown,
  Loader2,
  Check,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { apiClient } from "@/lib/api";

interface Plan {
  _id: string;
  name: string;
  weeklyClasses: number;
  pricing: {
    single: number;
    couple: number;
    group: number;
  };
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface CreatePlanData {
  name: string;
  weeklyClasses: number;
  pricing: {
    single: number;
    couple: number;
    group: number;
  };
  description: string;
  isActive: boolean;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState<
    "create" | "edit" | "deactivate" | "view" | null
  >(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch plans from API
  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient("api/plans");
      // Handle new API response structure with message, plans array, and total
      setPlans(response.plans || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch plans.");
    } finally {
      setIsLoading(false);
    }
  };

  // Create new plan
  const createPlan = async (planData: CreatePlanData) => {
    try {
      setIsSubmitting(true);
      setFormErrors({});
      const response = await apiClient("api/plans", {
        method: "POST",
        body: JSON.stringify(planData),
      });
      setPlans((prev) => [...prev, response.plan]);
      setSuccessMessage("Plan created successfully");
      handleClose();
    } catch (err: any) {
      if (err.message.includes("409")) {
        setFormErrors({ name: "Plan name already exists" });
      } else if (err.message.includes("400")) {
        setFormErrors({ general: "Please check all required fields" });
      } else {
        setError(err.message || "Failed to create plan");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing plan
  const updatePlan = async (planId: string, planData: CreatePlanData) => {
    try {
      setIsSubmitting(true);
      setFormErrors({});
      const response = await apiClient(`api/plans/${planId}`, {
        method: "PUT",
        body: JSON.stringify(planData),
      });
      setPlans((prev) =>
        prev.map((plan) => (plan._id === planId ? response.plan : plan))
      );
      setSuccessMessage("Plan updated successfully");
      handleClose();
    } catch (err: any) {
      if (err.message.includes("409")) {
        setFormErrors({ name: "Plan name already exists" });
      } else if (err.message.includes("400")) {
        setFormErrors({ general: "Please check all required fields" });
      } else if (err.message.includes("404")) {
        setError("Plan not found");
      } else {
        setError(err.message || "Failed to update plan");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deactivate plan
  const deactivatePlan = async (planId: string, reason: string) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await apiClient(`api/plans/${planId}/deactivate`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      setPlans((prev) =>
        prev.map((plan) =>
          plan._id === planId
            ? { ...plan, isActive: false, updatedAt: response.plan.updatedAt }
            : plan
        )
      );
      setSuccessMessage("Plan deactivated successfully");
      handleClose();
    } catch (err: any) {
      if (err.message.includes("400")) {
        setError("Plan is already deactivated or invalid ID");
      } else if (err.message.includes("404")) {
        setError("Plan not found");
      } else {
        setError(err.message || "Failed to deactivate plan");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Activate plan
  const activatePlan = async (planId: string) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await apiClient(`api/plans/${planId}/activate`, {
        method: "PATCH",
      });
      setPlans((prev) =>
        prev.map((plan) =>
          plan._id === planId
            ? { ...plan, isActive: true, updatedAt: response.plan.updatedAt }
            : plan
        )
      );
    } catch (err: any) {
      if (err.message.includes("400")) {
        setError("Plan is already active or invalid ID");
      } else if (err.message.includes("404")) {
        setError("Plan not found");
      } else {
        setError(err.message || "Failed to activate plan");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpen = (
    type: "create" | "edit" | "deactivate" | "view",
    plan?: Plan
  ) => {
    setSelectedPlan(plan || null);
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setSelectedPlan(null);
    setFormErrors({});
    setError(null);
    setSuccessMessage(null);
  };

  // Form validation
  const validateForm = (formData: any): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = "Name is required";
    }

    if (formData.weeklyClasses === undefined || formData.weeklyClasses < 0) {
      errors.weeklyClasses = "Weekly classes must be 0 or greater";
    }

    if (!formData.pricing?.single || formData.pricing.single < 0) {
      errors.singlePrice = "Single price must be 0 or greater";
    }

    if (!formData.pricing?.couple || formData.pricing.couple < 0) {
      errors.couplePrice = "Couple price must be 0 or greater";
    }

    if (!formData.pricing?.group || formData.pricing.group < 0) {
      errors.groupPrice = "Group price must be 0 or greater";
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    const planData = {
      name: formData.get("name") as string,
      weeklyClasses: Number(formData.get("weeklyClasses")),
      description: formData.get("description") as string,
      pricing: {
        single: Number(formData.get("singlePrice")),
        couple: Number(formData.get("couplePrice")),
        group: Number(formData.get("groupPrice")),
      },
      isActive:
        openDialog === "create" ? true : formData.get("isActive") === "true",
    };

    const errors = validateForm(planData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (openDialog === "create") {
      await createPlan(planData);
    } else if (openDialog === "edit" && selectedPlan) {
      await updatePlan(selectedPlan._id, planData);
    }
  };

  // Handle deactivate with reason
  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);
    const reason = formData.get("reason") as string;

    if (!reason?.trim()) {
      setFormErrors({ reason: "Reason is required" });
      return;
    }

    if (selectedPlan) {
      await deactivatePlan(selectedPlan._id, reason);
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

  const columns: ColumnDef<Plan>[] = [
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
      accessorKey: "weeklyClasses",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Weekly Classes
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.weeklyClasses} classes/week
        </span>
      ),
    },
    {
      accessorKey: "pricing",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Pricing
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      ),
      sortingFn: stringLocaleSort(),
      cell: ({ row }) => (
        <div className="text-sm">
          <div>Single: ${row.original.pricing.single}</div>
          <div>Couple: ${row.original.pricing.couple}</div>
          <div>Group: ${row.original.pricing.group}</div>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
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
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            row.original.isActive
              ? "bg-secondary/20 text-secondary"
              : "bg-accent-1/20 text-accent-1"
          }`}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </span>
      ),
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
          {row.original.isActive ? (
            <Button
              size="icon"
              variant="outline"
              className="text-accent-1 border-accent-1/50 hover:bg-accent-1/10"
              onClick={() => handleOpen("deactivate", row.original)}
            >
              <Ban className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              className="text-green-600 border-green-600/50 hover:bg-green-600/10"
              onClick={() => activatePlan(row.original._id)}
              disabled={isSubmitting}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        subtitle="Manage available language learning plans"
      >
        <Button variant="default" onClick={() => handleOpen("create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add plan
        </Button>
      </PageHeader>

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {!isLoading && !error && (
        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={plans}
              searchKeys={["name"]}
              searchPlaceholder="Search plans by name..."
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={openDialog !== null} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Add plan"}
              {openDialog === "edit" && "Edit plan"}
              {openDialog === "view" && "Plan Details"}
              {openDialog === "deactivate" && "Deactivate plan"}
            </DialogTitle>
          </DialogHeader>

          {(openDialog === "create" || openDialog === "edit") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {formErrors.general}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={selectedPlan?.name || ""}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeklyClasses">Weekly Classes *</Label>
                <Input
                  id="weeklyClasses"
                  name="weeklyClasses"
                  type="number"
                  min="0"
                  defaultValue={selectedPlan?.weeklyClasses || ""}
                  className={formErrors.weeklyClasses ? "border-red-500" : ""}
                />
                {formErrors.weeklyClasses && (
                  <p className="text-red-500 text-sm">
                    {formErrors.weeklyClasses}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={selectedPlan?.description || ""}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="singlePrice">Single Price *</Label>
                  <Input
                    id="singlePrice"
                    name="singlePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={selectedPlan?.pricing.single || ""}
                    className={formErrors.singlePrice ? "border-red-500" : ""}
                  />
                  {formErrors.singlePrice && (
                    <p className="text-red-500 text-sm">
                      {formErrors.singlePrice}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="couplePrice">Couple Price *</Label>
                  <Input
                    id="couplePrice"
                    name="couplePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={selectedPlan?.pricing.couple || ""}
                    className={formErrors.couplePrice ? "border-red-500" : ""}
                  />
                  {formErrors.couplePrice && (
                    <p className="text-red-500 text-sm">
                      {formErrors.couplePrice}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="groupPrice">Group Price *</Label>
                  <Input
                    id="groupPrice"
                    name="groupPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={selectedPlan?.pricing.group || ""}
                    className={formErrors.groupPrice ? "border-red-500" : ""}
                  />
                  {formErrors.groupPrice && (
                    <p className="text-red-500 text-sm">
                      {formErrors.groupPrice}
                    </p>
                  )}
                </div>
              </div>

              {openDialog === "edit" && (
                <div className="space-y-2">
                  <Label htmlFor="isActive">Status</Label>
                  <select
                    id="isActive"
                    name="isActive"
                    defaultValue={selectedPlan?.isActive ? "true" : "false"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              )}
            </form>
          )}

          {openDialog === "view" && selectedPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Name</Label>
                  <p className="text-sm font-semibold">{selectedPlan.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">
                    Weekly Classes
                  </Label>
                  <p className="text-sm">
                    {selectedPlan.weeklyClasses} classes per week
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  <p className="text-sm">{selectedPlan.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Pricing</Label>
                  <div className="text-sm space-y-1">
                    <p>Single: ${selectedPlan.pricing.single}</p>
                    <p>Couple: ${selectedPlan.pricing.couple}</p>
                    <p>Group: ${selectedPlan.pricing.group}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedPlan.isActive
                        ? "bg-secondary/20 text-secondary"
                        : "bg-accent-1/20 text-accent-1"
                    }`}
                  >
                    {selectedPlan.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {openDialog === "deactivate" && (
            <form onSubmit={handleDeactivate} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to deactivate{" "}
                <strong>{selectedPlan?.name}</strong>?
              </p>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for deactivation *</Label>
                <Input
                  id="reason"
                  name="reason"
                  placeholder="Enter reason for deactivation..."
                  className={formErrors.reason ? "border-red-500" : ""}
                />
                {formErrors.reason && (
                  <p className="text-red-500 text-sm">{formErrors.reason}</p>
                )}
              </div>
            </form>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {openDialog === "view" ? "Close" : "Cancel"}
            </Button>
            {openDialog !== "view" && (
              <Button
                variant={
                  openDialog === "deactivate" ? "destructive" : "default"
                }
                disabled={isSubmitting}
                onClick={() => {
                  if (openDialog === "create" || openDialog === "edit") {
                    const form = document.querySelector("form");
                    if (form) form.requestSubmit();
                  } else if (openDialog === "deactivate") {
                    const form = document.querySelector("form");
                    if (form) form.requestSubmit();
                  }
                }}
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {openDialog === "create" && "Create"}
                {openDialog === "edit" && "Save changes"}
                {openDialog === "deactivate" && "Deactivate"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
