/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Ban } from "lucide-react";

export default function PlansPage() {
  const [plans] = useState([
    { name: "Inglés B1", duration: "3 months", price: "$120" },
    { name: "Francés A2", duration: "6 months", price: "$200" },
    { name: "Alemán C1", duration: "4 months", price: "$180" },
  ]);

  const [openDialog, setOpenDialog] = useState<"create" | "edit" | "deactivate" | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const handleOpen = (type: "create" | "edit" | "deactivate", plan?: any) => {
    setSelectedPlan(plan || null);
    setOpenDialog(type);
  };

  const handleClose = () => {
    setOpenDialog(null);
    setSelectedPlan(null);
  };

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

      <Card >
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan, i) => (
                <TableRow key={i}>
                  <TableCell>{plan.name}</TableCell>
                  <TableCell>{plan.duration}</TableCell>
                  <TableCell>{plan.price}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-primary"
                        onClick={() => handleOpen("edit", plan)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-accent1"
                        onClick={() => handleOpen("deactivate", plan)}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openDialog !== null} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {openDialog === "create" && "Add plan"}
              {openDialog === "edit" && "Edit plan"}
              {openDialog === "deactivate" && "Deactivate plan"}
            </DialogTitle>
          </DialogHeader>

          {(openDialog === "create" || openDialog === "edit") && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" defaultValue={selectedPlan?.name || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input id="duration" defaultValue={selectedPlan?.duration || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" defaultValue={selectedPlan?.price || ""} />
              </div>
            </div>
          )}

          {openDialog === "deactivate" && (
            <p className="text-sm text-muted-foreground">
              Are you sure you want to deactivate {selectedPlan?.name}?
            </p>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button variant={openDialog === "deactivate" ? "destructive" : "default"}>
              {openDialog === "create" && "Create"}
              {openDialog === "edit" && "Save changes"}
              {openDialog === "deactivate" && "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
