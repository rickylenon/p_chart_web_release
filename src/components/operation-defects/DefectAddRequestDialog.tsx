import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { UserSession } from "@/lib/clientAuth";
import { useNotification } from "@/contexts/NotificationContext";

interface MasterDefect {
  id: string;
  name: string;
  category: string;
  reworkable: boolean;
  machine?: string;
}

interface DefectAddRequestDialogProps {
  open: boolean;
  onClose: () => void;
  defect: MasterDefect;
  operationId: number | undefined;
  operationCode: string;
  poNumber: string;
}

export function DefectAddRequestDialog({
  open,
  onClose,
  defect,
  operationId,
  operationCode,
  poNumber,
}: DefectAddRequestDialogProps) {
  console.log("Rendering DefectAddRequestDialog with defect:", defect);

  const { toast } = useToast();
  const { socket, isConnected, emit } = useNotification();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [requestedValues, setRequestedValues] = useState({
    quantity: 1,
    quantityRework: defect.reworkable ? 0 : 0,
    quantityNogood: defect.reworkable ? 1 : 1,
    quantityReplacement: operationCode.toLowerCase() === "op10" ? 1 : 0,
  });

  useEffect(() => {
    setRequestedValues({
      quantity: 1,
      quantityRework: defect.reworkable ? 0 : 0,
      quantityNogood: defect.reworkable ? 1 : 1,
      quantityReplacement: operationCode.toLowerCase() === "op10" ? 1 : 0,
    });
    setReason("");
  }, [defect, operationCode]);

  const handleQuantityChange = (
    field:
      | "quantity"
      | "quantityRework"
      | "quantityNogood"
      | "quantityReplacement",
    value: number
  ) => {
    console.log(`Updating ${field} to ${value}`);

    setRequestedValues((prev) => {
      const updatedValues = { ...prev };

      if (field === "quantity") {
        updatedValues.quantity = value;

        if (defect.reworkable) {
          updatedValues.quantityRework = Math.min(prev.quantityRework, value);
          updatedValues.quantityNogood = value - updatedValues.quantityRework;
        } else {
          updatedValues.quantityRework = 0;
          updatedValues.quantityNogood = value;
        }

        if (operationCode.toLowerCase() === "op10") {
          updatedValues.quantityReplacement = value;
        }
      }

      if (field === "quantityRework") {
        const cappedValue = Math.min(value, prev.quantity);
        updatedValues.quantityRework = cappedValue;
        updatedValues.quantityNogood = prev.quantity - cappedValue;
      }

      if (field === "quantityNogood") {
        const cappedValue = Math.min(value, prev.quantity);
        updatedValues.quantityNogood = cappedValue;
        updatedValues.quantityRework = prev.quantity - cappedValue;
      }

      if (field === "quantityReplacement") {
        updatedValues.quantityReplacement = Math.min(value, prev.quantity);
      }

      return updatedValues;
    });
  };

  const handleSubmit = async () => {
    if (requestedValues.quantity <= 0 || !reason.trim() || isSubmitting) return;

    console.log("Submit request with poNumber:", poNumber);

    if (!operationId) {
      toast({
        title: "Error",
        description: "Operation ID is missing",
        variant: "destructive",
      });
      return;
    }

    if (!poNumber) {
      toast({
        title: "Error",
        description: "Production Order Number is missing",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Submitting defect add request:", {
        defect,
        operationId,
        values: requestedValues,
        poNumber,
      });

      const missingFields = [];
      if (!operationId) missingFields.push("operationId");
      if (!poNumber) missingFields.push("poNumber");
      if (!reason.trim()) missingFields.push("reason");
      if (!defect.id) missingFields.push("defectId");
      if (!defect.name) missingFields.push("defectName");
      if (requestedValues.quantity <= 0)
        missingFields.push("quantity (must be > 0)");

      if (missingFields.length > 0) {
        console.error("Missing required fields for add request:", {
          operationId,
          poNumber,
          hasReason: !!reason.trim(),
          defectId: defect.id,
          defectName: defect.name,
          qty: requestedValues.quantity,
          rw: requestedValues.quantityRework,
          ng: requestedValues.quantityNogood,
          rp: requestedValues.quantityReplacement,
        });
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      const requestBody = {
        requestType: "add",
        operationId: Number(operationId),
        defectId: Number(defect.id),
        defectName: defect.name,
        defectCategory: defect.category || "",
        defectReworkable: !!defect.reworkable,
        defectMachine: defect.machine || "",
        poNumber,
        currentQty: 0,
        currentRw: 0,
        currentNg: 0,
        currentReplacement: 0,
        requestedQty: requestedValues.quantity,
        requestedRw: requestedValues.quantityRework,
        requestedNg: requestedValues.quantityNogood,
        requestedReplacement: requestedValues.quantityReplacement,
        reason: reason.trim(),
        operationCode,
      };

      console.log("Request payload:", JSON.stringify(requestBody, null, 2));

      const response = await fetch("/api/operation-defect-edit-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...UserSession.getAuthHeaders(),
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(
          errorData.error || `Failed to submit add request (${response.status})`
        );
      }

      const responseData = await response.json();
      console.log("Success response:", responseData);

      if (isConnected && socket) {
        console.log(
          "Emitting defect-add-requested event via WebSocket for real-time updates"
        );

        const userData = await UserSession.getCurrentUser();

        emit("defect-edit-requested", {
          id: responseData.editRequest?.id,
          requestType: "add",
          defectId: defect.id,
          defectName: defect.name,
          poNumber,
          requestedQty: requestedValues.quantity,
          requestedById: userData?.id,
          userName: userData?.name,
          userRole: userData?.role,
          createdAt: new Date().toISOString(),
        });
      } else {
        console.warn(
          "Socket not connected, only server-side notification will be created"
        );
      }

      toast({
        title: "Add request submitted",
        description:
          responseData.message ||
          "Your request to add this defect has been sent for approval",
      });

      onClose();
      setReason("");
      setRequestedValues({
        quantity: 1,
        quantityRework: defect.reworkable ? 0 : 0,
        quantityNogood: defect.reworkable ? 1 : 1,
        quantityReplacement: operationCode.toLowerCase() === "op10" ? 1 : 0,
      });
    } catch (error) {
      console.error("Error submitting add request:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Request to Add Defect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <h3 className="font-medium text-lg dark:text-white">
              {defect.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {defect.category}
            </p>
            {defect.machine && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Machine: {defect.machine}
              </p>
            )}
            {defect.reworkable && (
              <p className="text-xs text-green-500 dark:text-green-400 mt-1 font-medium">
                Reworkable
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium mb-1 dark:text-gray-300">
              Requested Quantity *
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  QTY
                </div>
                <Input
                  type="number"
                  min="1"
                  className="h-9 dark:bg-black"
                  value={requestedValues.quantity}
                  onChange={(e) =>
                    handleQuantityChange(
                      "quantity",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  RW
                </div>
                <Input
                  type="number"
                  min="0"
                  className={`h-9 ${
                    !defect.reworkable
                      ? "bg-gray-100 dark:bg-black/70"
                      : "dark:bg-black"
                  }`}
                  value={requestedValues.quantityRework}
                  onChange={(e) =>
                    handleQuantityChange(
                      "quantityRework",
                      parseInt(e.target.value) || 0
                    )
                  }
                  disabled={!defect.reworkable}
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  NG
                </div>
                <Input
                  type="number"
                  min="0"
                  className="h-9 dark:bg-black"
                  value={requestedValues.quantityNogood}
                  onChange={(e) =>
                    handleQuantityChange(
                      "quantityNogood",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
            </div>

            {operationCode.toLowerCase() === "op10" && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    RP
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max={requestedValues.quantity}
                    className="h-9 border-blue-300 dark:border-blue-700 dark:bg-black"
                    value={requestedValues.quantityReplacement}
                    onChange={(e) =>
                      handleQuantityChange(
                        "quantityReplacement",
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-sm font-medium mb-1 dark:text-gray-300">
              Reason for Adding *
            </div>
            <Textarea
              placeholder="Provide a detailed reason for adding this defect"
              className="resize-none dark:bg-black"
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setReason(e.target.value)
              }
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              requestedValues.quantity <= 0 || !reason.trim() || isSubmitting
            }
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
