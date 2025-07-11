"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { UserSession } from "@/lib/clientAuth";
import { useNotification } from "@/contexts/NotificationContext";

interface OperationDefect {
  id: string;
  operationId: number;
  operationDefectId?: number | null;
  name?: string;
  defectName?: string;
  category?: string;
  defectCategory?: string;
  machine?: string;
  defectMachine?: string;
  reworkable?: boolean;
  defectReworkable?: boolean;
  quantity: number;
  quantityRework: number;
  quantityNogood: number;
  quantityReplacement?: number;
}

interface DefectEditRequestPopoverProps {
  defect: OperationDefect;
  operationCode: string;
  poNumber: string;
  disabled?: boolean;
  onClose?: () => void;
}

export function DefectEditRequestPopover({
  defect,
  operationCode,
  poNumber,
  disabled = false,
  onClose,
}: DefectEditRequestPopoverProps) {
  const { toast } = useToast();
  const { socket, isConnected, emit } = useNotification();

  // Optimize the component by memoizing the defect data and preventing excessive re-renders
  const defectNameToShow = React.useMemo(
    () => defect.defectName || defect.name,
    [defect.defectName, defect.name]
  );
  const defectCategoryToShow = React.useMemo(
    () => defect.defectCategory || defect.category,
    [defect.defectCategory, defect.category]
  );
  const defectMachineToShow = React.useMemo(
    () => defect.defectMachine || defect.machine,
    [defect.defectMachine, defect.machine]
  );
  const isReworkable = React.useMemo(
    () =>
      defect.defectReworkable !== undefined
        ? defect.defectReworkable
        : defect.reworkable,
    [defect.defectReworkable, defect.reworkable]
  );

  // Initialize state only once with the initial values
  const [requestedValues, setRequestedValues] = useState(() => ({
    quantity: defect.quantity,
    quantityRework: defect.quantityRework,
    quantityNogood: defect.quantityNogood,
    quantityReplacement:
      defect.quantityReplacement !== undefined
        ? defect.quantityReplacement
        : defect.quantity,
  }));

  // Add flag to track if this is a delete request (when quantity is 0)
  const isDeleteRequest = React.useMemo(
    () => requestedValues.quantity === 0,
    [requestedValues.quantity]
  );

  // Monitor changes between requested and current values - use useMemo to prevent recalculating on every render
  const hasChanges = React.useMemo(
    () =>
      requestedValues.quantity !== defect.quantity ||
      requestedValues.quantityRework !== defect.quantityRework ||
      requestedValues.quantityNogood !== defect.quantityNogood ||
      (operationCode.toLowerCase() === "op10" &&
        requestedValues.quantityReplacement !==
          (defect.quantityReplacement !== undefined
            ? defect.quantityReplacement
            : defect.quantity)),
    [
      requestedValues,
      defect.quantity,
      defect.quantityRework,
      defect.quantityNogood,
      defect.quantityReplacement,
      operationCode,
    ]
  );

  // Initialize component state and fetch required data
  useEffect(() => {
    console.log("DefectEditRequestPopover mounted for defect:", {
      id: defect.id,
      name: defect.name || defect.defectName,
      category: defect.category || defect.defectCategory,
      operationDefectId: defect.operationDefectId,
    });

    // Initialize requested values with current values
    setRequestedValues({
      quantity: defect.quantity,
      quantityRework: defect.quantityRework,
      quantityNogood: defect.quantityNogood,
      quantityReplacement:
        defect.quantityReplacement !== undefined
          ? defect.quantityReplacement
          : defect.quantity,
    });

    console.log("Operation code:", operationCode);
    console.log("PO number:", poNumber);

    // Return a cleanup function to prevent memory leaks
    return () => {
      // Clean up any resources when the component unmounts
      console.log("DefectEditRequestPopover unmounted");
    };
  }, [
    defect.category,
    defect.defectCategory,
    defect.defectName,
    defect.id,
    defect.name,
    defect.operationId,
    defect.quantity,
    defect.quantityRework,
    defect.quantityNogood,
    defect.quantityReplacement,
    operationCode,
    poNumber,
  ]); // Add all required dependencies

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<null | {
    id: string;
    requestedQty: number;
    requestedRw: number;
    requestedNg: number;
    requestedReplacement: number;
    reason: string;
    requestedBy: string | { id: string; name: string; email: string };
    status: string;
  }>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to reset form to default values - moved up before fetchExistingRequest
  const resetToDefaults = useCallback(() => {
    setExistingRequest(null);
    setRequestedValues({
      quantity: defect.quantity,
      quantityRework: defect.quantityRework,
      quantityNogood: defect.quantityNogood,
      quantityReplacement:
        defect.quantityReplacement !== undefined
          ? defect.quantityReplacement
          : defect.quantity,
    });
    setReason("");
  }, [
    defect.quantity,
    defect.quantityRework,
    defect.quantityNogood,
    defect.quantityReplacement,
  ]);

  // Define fetchExistingRequest using useCallback before it's used in useEffect
  const fetchExistingRequest = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log(
        "[fetchExistingRequest] Fetching existing requests for defect:",
        defect
      );

      // Skip fetching if there's no operationDefectId (defect not yet saved in database)
      if (!defect.operationDefectId) {
        console.log(
          "[fetchExistingRequest] No operationDefectId available, skipping fetch"
        );
        resetToDefaults();
        setIsLoading(false);
        return;
      }

      // Ensure operationDefectId is a valid number before using it
      const operationDefectId = Number(defect.operationDefectId);
      if (isNaN(operationDefectId)) {
        console.log(
          "[fetchExistingRequest] Invalid operationDefectId, skipping fetch"
        );
        resetToDefaults();
        setIsLoading(false);
        return;
      }

      // Use operationDefectId when available for more accurate fetching
      const queryParam = `operationDefectId=${operationDefectId}`;

      console.log(
        "[fetchExistingRequest] Using query param for fetch:",
        queryParam
      );

      const response = await fetch(
        `/api/operation-defect-edit-requests?${queryParam}`,
        {
          method: "GET",
          headers: {
            ...UserSession.getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "[fetchExistingRequest] Failed to fetch existing requests"
        );
      }

      const data = await response.json();
      console.log("[fetchExistingRequest] Existing requests response:", data);

      // Check if we have edit requests in the response
      if (data.editRequests && data.editRequests.length > 0) {
        // Log all requests with their statuses to debug
        console.log(
          "[fetchExistingRequest] All edit requests with statuses:",
          data.editRequests.map((req: any) => ({
            id: req.id,
            operationDefectId: req.operationDefectId,
            status: req.status,
          }))
        );

        // First verify the operationDefectId matches what we expect
        const matchingRequests = data.editRequests.filter(
          (req: any) =>
            req.operationDefectId ===
            (defect.operationDefectId
              ? Number(defect.operationDefectId)
              : Number(defect.id))
        );

        if (matchingRequests.length === 0) {
          console.log(
            `[fetchExistingRequest] No requests with matching operationDefectId ${defect.operationDefectId} found. All requests have different IDs.`
          );
          resetToDefaults();
          return;
        }

        console.log(
          "[fetchExistingRequest] Matching requests by operationDefectId:",
          matchingRequests.length
        );

        // Then filter for pending requests only
        const pendingRequests = matchingRequests.filter(
          (req: any) => req.status === "pending"
        );
        console.log(
          "[fetchExistingRequest] Pending requests found:",
          pendingRequests.length
        );

        if (pendingRequests.length > 0) {
          // Get the most recent pending request (first in array)
          const pendingRequest = pendingRequests[0];
          console.log(
            "[fetchExistingRequest] Using pending request:",
            pendingRequest
          );
          console.log(
            "[fetchExistingRequest] Pending request requestedBy type:",
            typeof pendingRequest.requestedBy
          );
          console.log(
            "[fetchExistingRequest] Pending request requestedBy value:",
            pendingRequest.requestedBy
          );

          // Process the pending request to ensure proper data types
          const processedRequest = {
            id: pendingRequest.id?.toString() || "",
            requestedQty: Number(pendingRequest.requestedQty) || 0,
            requestedRw: Number(pendingRequest.requestedRw) || 0,
            requestedNg: Number(pendingRequest.requestedNg) || 0,
            requestedReplacement:
              Number(pendingRequest.requestedReplacement) || 0,
            reason: pendingRequest.reason || "",
            requestedBy: pendingRequest.requestedBy || "Unknown",
            status: pendingRequest.status || "pending",
          };

          console.log(
            "[fetchExistingRequest] Processed request:",
            processedRequest
          );

          // Store the existing request
          setExistingRequest(processedRequest);

          // Populate form with existing request values
          setRequestedValues({
            quantity: processedRequest.requestedQty,
            quantityRework: processedRequest.requestedRw,
            quantityNogood: processedRequest.requestedNg,
            quantityReplacement:
              processedRequest.requestedReplacement ||
              processedRequest.requestedQty,
          });

          setReason(processedRequest.reason || "");

          // Log the request type from the existing request
          if (pendingRequest.requestType) {
            console.log(
              "[fetchExistingRequest] Existing request type:",
              pendingRequest.requestType
            );
          }
        } else {
          // No pending requests found
          console.log("[fetchExistingRequest] No pending requests found");
          resetToDefaults();
        }
      } else {
        // No edit requests at all
        console.log(
          "[fetchExistingRequest] No edit requests found in response"
        );
        resetToDefaults();
      }
    } catch (error) {
      console.error(
        "[fetchExistingRequest] Error fetching existing requests:",
        error
      );
      toast({
        title: "Error",
        description: "Failed to check for existing edit requests",
        variant: "destructive",
      });
      resetToDefaults();
    } finally {
      setIsLoading(false);
    }
  }, [
    defect.id,
    defect.operationDefectId,
    defect.quantity,
    defect.quantityRework,
    defect.quantityNogood,
    defect.quantityReplacement,
    resetToDefaults,
    toast,
  ]);

  // Fetch existing pending request when popover opens
  useEffect(() => {
    if (open) {
      fetchExistingRequest();
    }
  }, [open, fetchExistingRequest]);

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

        if (value === 0) {
          // When changing QTY to 0, it's a delete request, set both RW and NG to 0
          updatedValues.quantityRework = 0;
          updatedValues.quantityNogood = 0;
          updatedValues.quantityReplacement = 0;
        } else {
          // Standard behavior when qty > 0: reset RW to 0 and set NG to the same value
          updatedValues.quantityRework = 0;
          updatedValues.quantityNogood = value;

          // For OP10, update replacement quantity to match the new quantity by default
          if (operationCode.toLowerCase() === "op10") {
            updatedValues.quantityReplacement = value;
            console.log(
              `OP10 detected: Setting replacement to match quantity: ${value}`
            );
          }
        }
      }

      if (field === "quantityRework") {
        // Cap RW at QTY
        const cappedValue = Math.min(value, prev.quantity);
        updatedValues.quantityRework = cappedValue;
        // Adjust NG based on new RW
        updatedValues.quantityNogood = prev.quantity - cappedValue;
      }

      if (field === "quantityNogood") {
        // Cap NG at QTY
        const cappedValue = Math.min(value, prev.quantity);
        updatedValues.quantityNogood = cappedValue;
        // Adjust RW based on new NG
        updatedValues.quantityRework = prev.quantity - cappedValue;
      }

      if (field === "quantityReplacement") {
        updatedValues.quantityReplacement = value;
      }

      return updatedValues;
    });
  };

  // Add helper function to set quantity to zero (for delete request)
  const handleSetDeleteRequest = () => {
    setRequestedValues({
      quantity: 0,
      quantityRework: 0,
      quantityNogood: 0,
      quantityReplacement: 0,
    });
  };

  const handleSubmit = async () => {
    if (!hasChanges || !reason.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      console.log(
        "Submitting edit request for defect:",
        defect.id,
        defect.defectName || defect.name
      );
      console.log("Is delete request:", isDeleteRequest);

      // Check if request type has changed from existing request
      if (existingRequest) {
        const wasDeleteRequest = existingRequest.requestedQty === 0;
        if (wasDeleteRequest !== isDeleteRequest) {
          console.log(
            `Request type changed: from ${
              wasDeleteRequest ? "delete" : "edit"
            } to ${isDeleteRequest ? "delete" : "edit"}`
          );
        }
      }

      // Use the original record ID if available
      const operationDefectIdToUse = defect.operationDefectId || defect.id;
      console.log(
        "Using operation defect ID for submission:",
        operationDefectIdToUse
      );

      // Always use POST but add the existing request ID as a parameter when updating
      console.log(`${existingRequest ? "Updating" : "Creating"} edit request`);

      const requestBody = {
        operationDefectId: operationDefectIdToUse,
        defectName: defect.defectName || defect.name,
        poNumber,
        currentQty: defect.quantity,
        currentRw: defect.quantityRework,
        currentNg: defect.quantityNogood,
        currentReplacement:
          defect.quantityReplacement !== undefined
            ? defect.quantityReplacement
            : defect.quantity,
        requestedQty: requestedValues.quantity,
        requestedRw: requestedValues.quantityRework,
        requestedNg: requestedValues.quantityNogood,
        requestedReplacement: requestedValues.quantityReplacement,
        reason,
        requestType: isDeleteRequest ? "delete" : "edit",
        operationCode, // Add operation code to identify OP10
        // Include the existing request ID if we're updating
        ...(existingRequest && { requestId: existingRequest.id }),
      };

      console.log("Request payload:", requestBody);
      // Add more detailed logging to track the request type
      console.log(
        "Request type being sent:",
        isDeleteRequest ? "delete" : "edit"
      );
      // Add more detailed logging to track the existing request ID when updating
      if (existingRequest) {
        console.log("Updating existing request ID:", existingRequest.id);
      }

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
          errorData.error ||
            `Failed to submit edit request (${response.status})`
        );
      }

      const responseData = await response.json();
      console.log("Success response:", responseData);

      // If socket is connected, emit the event for real-time notification
      if (isConnected && socket) {
        console.log(
          "Emitting defect-edit-requested event via WebSocket for real-time updates"
        );

        // Get current user data
        const userData = await UserSession.getCurrentUser();

        // Emit the event with request data
        emit("defect-edit-requested", {
          id: responseData.editRequest?.id,
          operationDefectId: operationDefectIdToUse,
          defectName: defect.defectName || defect.name,
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
        title: existingRequest
          ? "Edit request updated"
          : isDeleteRequest
          ? "Delete request submitted"
          : "Edit request submitted",
        description:
          responseData.message ||
          (existingRequest
            ? "Your request has been updated"
            : isDeleteRequest
            ? "Your request to delete this defect has been sent to admin for approval"
            : "Your request has been sent to admin for approval"),
      });

      // Close the popover and reset form
      handleClosePopover();

      // if onClose is provided, call it to refresh the parent component
      if (onClose) {
        onClose();
      }

      setReason("");
      setRequestedValues({
        quantity: defect.quantity,
        quantityRework: defect.quantityRework,
        quantityNogood: defect.quantityNogood,
        quantityReplacement:
          defect.quantityReplacement !== undefined
            ? defect.quantityReplacement
            : defect.quantity,
      });
    } catch (error) {
      console.error("Error submitting edit request:", error);
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

  const handleClosePopover = () => {
    setOpen(false);
    if (onClose) {
      onClose();
    }
  };

  // Optimize the popover open/close handling
  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);

      // Only call onClose when the popover is being closed
      if (!newOpen && onClose) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white-800 bg-primary/80 hover:bg-primary/100 h-5 w-5 p-1 -mt-1 -mr-1 rounded-full border border-primay"
          disabled={disabled}
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Request edit permission</span>
        </Button>
      </PopoverTrigger>
      {/* Only render the content when open to prevent unnecessary DOM elements */}
      {open && (
        <PopoverContent className="w-80">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
              <div>
                <h3 className="font-medium text-lg">
                  {isDeleteRequest
                    ? "Request Delete Permission"
                    : "Request Edit Permission"}
                </h3>
                <p className="text-sm text-gray-500">{defectNameToShow}</p>
                <p className="text-xs text-gray-400">
                  {defectCategoryToShow}
                  {defectMachineToShow && ` | Machine: ${defectMachineToShow}`}
                </p>
              </div>

              {existingRequest && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <div className="font-medium text-amber-700">
                    Pending Request Exists
                  </div>
                  <p className="text-sm text-amber-600">
                    There is already a pending request submitted by{" "}
                    {typeof existingRequest.requestedBy === "object"
                      ? existingRequest.requestedBy.name
                      : existingRequest.requestedBy}
                    . You can update it below.
                  </p>
                </div>
              )}

              {isDeleteRequest && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="font-medium text-red-700">Delete Request</div>
                  <p className="text-sm text-red-600">
                    Setting quantity to zero will request deletion of this
                    defect. Admin approval is required.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium mb-1">
                    Requested Value *
                  </div>
                  {!isDeleteRequest && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 h-7 px-2 py-1"
                      onClick={handleSetDeleteRequest}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Delete</span>
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">QTY</div>
                    <Input
                      type="number"
                      min="0"
                      className={`h-9 ${
                        isDeleteRequest
                          ? "border-red-300 focus:ring-red-500"
                          : ""
                      }`}
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
                    <div className="text-xs text-gray-500 mb-1">RW</div>
                    <Input
                      type="number"
                      min="0"
                      className={`h-9 ${!isReworkable ? "bg-gray-100" : ""} ${
                        isDeleteRequest ? "bg-gray-100" : ""
                      }`}
                      value={requestedValues.quantityRework}
                      onChange={(e) =>
                        handleQuantityChange(
                          "quantityRework",
                          parseInt(e.target.value) || 0
                        )
                      }
                      disabled={!isReworkable || isDeleteRequest}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">NG</div>
                    <Input
                      type="number"
                      min="0"
                      className={`h-9 ${isDeleteRequest ? "bg-gray-100" : ""}`}
                      value={requestedValues.quantityNogood}
                      onChange={(e) =>
                        handleQuantityChange(
                          "quantityNogood",
                          parseInt(e.target.value) || 0
                        )
                      }
                      disabled={isDeleteRequest}
                    />
                  </div>
                </div>

                {/* Show Replacement field only for OP10 */}
                {operationCode.toLowerCase() === "op10" && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">RP</div>
                      <Input
                        type="number"
                        min="0"
                        max={requestedValues.quantity}
                        className={`h-9 border-blue-300 focus:ring-blue-500 ${
                          isDeleteRequest ? "bg-gray-100" : ""
                        }`}
                        value={requestedValues.quantityReplacement}
                        onChange={(e) =>
                          handleQuantityChange(
                            "quantityReplacement",
                            parseInt(e.target.value) || 0
                          )
                        }
                        disabled={isDeleteRequest}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium mb-1">
                  Reason for Change *
                </div>
                <Textarea
                  placeholder={
                    isDeleteRequest
                      ? "Provide a detailed reason for this deletion request"
                      : "Provide a detailed reason for this change request"
                  }
                  className="resize-none"
                  value={reason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setReason(e.target.value)
                  }
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClosePopover}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!hasChanges || !reason.trim() || isSubmitting}
                  className={
                    isDeleteRequest ? "bg-red-600 hover:bg-red-700" : ""
                  }
                >
                  {isSubmitting
                    ? "Submitting..."
                    : existingRequest
                    ? "Update Request"
                    : isDeleteRequest
                    ? "Request Delete"
                    : "Submit Request"}
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      )}
    </Popover>
  );
}
