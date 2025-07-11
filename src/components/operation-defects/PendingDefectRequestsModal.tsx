import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserSession } from "@/lib/clientAuth";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, Edit, Trash2 } from "lucide-react";

interface PendingDefectRequestsProps {
  open: boolean;
  onClose: () => void;
  operationId: number | undefined;
  operationCode: string;
  poNumber: string;
  onRefresh: () => void;
  isAdmin: boolean;
}

interface PendingRequest {
  id: number;
  requestType: string;
  operationDefectId: number | null;
  defectId: number | null;
  defectName: string | null;
  defectCategory: string | null;
  defectReworkable: boolean | null;
  defectMachine: string | null;
  currentQty: number;
  currentRw: number;
  currentNg: number;
  currentReplacement?: number;
  requestedQty: number;
  requestedRw: number;
  requestedNg: number;
  requestedReplacement?: number;
  operationCode?: string;
  reason: string;
  status: string;
  createdAt: string;
  requestedBy: {
    id: number;
    name: string;
    email: string;
  };
  operationDefect?: {
    id: number;
    defectName: string;
    defectCategory: string;
    defectReworkable: boolean;
    defectMachine: string | null;
  } | null;
}

export function PendingDefectRequestsModal({
  open,
  onClose,
  operationId,
  operationCode,
  poNumber,
  onRefresh,
  isAdmin,
}: PendingDefectRequestsProps) {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch pending requests when the modal opens
  useEffect(() => {
    if (open && operationId) {
      fetchPendingRequests();
    }
  }, [open, operationId]);

  const fetchPendingRequests = async () => {
    if (!operationId) return;

    setIsLoading(true);
    try {
      console.log(`Fetching pending requests for operation ${operationId}`);

      // Note: We're no longer filtering by requestType to get all types
      const response = await fetch(
        `/api/operation-defect-edit-requests?operationId=${operationId}&status=pending`,
        {
          method: "GET",
          headers: {
            ...UserSession.getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch pending requests (${response.status})`
        );
      }

      const data = await response.json();
      console.log("Pending requests response:", data);

      if (data.editRequests && Array.isArray(data.editRequests)) {
        setPendingRequests(data.editRequests);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      toast({
        title: "Error",
        description: "Failed to load pending defect requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function for admin to handle request (approve/reject)
  const handleRequestAction = async (
    requestId: number,
    action: "approved" | "rejected",
    comments: string = ""
  ) => {
    if (!isAdmin) return;

    try {
      console.log(`${action} request ${requestId} with comment: ${comments}`);

      const response = await fetch(
        `/api/operation-defect-edit-requests/${requestId}/resolve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...UserSession.getAuthHeaders(),
          },
          body: JSON.stringify({
            status: action,
            comments,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} request`);
      }

      toast({
        title: "Success",
        description: `Request ${action} successfully`,
      });

      // Refresh the requests list
      fetchPendingRequests();

      // Trigger parent refresh to update the defects list
      onRefresh();
    } catch (error) {
      console.error(`Error ${action} request:`, error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to ${action} request`,
        variant: "destructive",
      });
    }
  };

  // Helper to get appropriate icon by request type
  const getRequestTypeIcon = (requestType: string) => {
    switch (requestType) {
      case "add":
        return <PlusCircle className="w-4 h-4 text-green-500" />;
      case "edit":
        return <Edit className="w-4 h-4 text-blue-500" />;
      case "delete":
        return <Trash2 className="w-4 h-4 text-red-500" />;
      default:
        return <Edit className="w-4 h-4 text-gray-500" />;
    }
  };

  // Helper to get appropriate text for request type
  const getRequestTypeText = (requestType: string) => {
    switch (requestType) {
      case "add":
        return "Add";
      case "edit":
        return "Edit";
      case "delete":
        return "Delete";
      default:
        return "Update";
    }
  };

  // Helper to get appropriate color for request type
  const getRequestTypeColor = (requestType: string) => {
    switch (requestType) {
      case "add":
        return "border-l-green-400 bg-green-50 dark:bg-green-950/30 dark:border-l-green-600";
      case "edit":
        return "border-l-blue-400 bg-blue-50 dark:bg-blue-950/30 dark:border-l-blue-600";
      case "delete":
        return "border-l-red-400 bg-red-50 dark:bg-red-950/30 dark:border-l-red-600";
      default:
        return "border-l-purple-400 bg-purple-50 dark:bg-purple-950/30 dark:border-l-purple-600";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Pending Defect Requests</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 dark:bg-black rounded-md border border-gray-200 dark:border-gray-800">
              <p className="text-gray-500 dark:text-gray-400">
                No pending defect requests for this operation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className={`border border-l-4 rounded-md p-4 bg-white dark:bg-black shadow-sm ${getRequestTypeColor(
                    request.requestType
                  )}`}
                >
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        {getRequestTypeIcon(request.requestType)}
                        <span className="font-medium text-sm uppercase dark:text-gray-300">
                          {getRequestTypeText(request.requestType)} Request
                        </span>
                      </div>

                      <h3 className="font-medium text-md dark:text-white">
                        {request.requestType === "add"
                          ? request.defectName
                          : request.operationDefect?.defectName ||
                            request.defectName ||
                            "Unknown Defect"}
                      </h3>

                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {request.requestType === "add"
                          ? request.defectCategory
                          : request.operationDefect?.defectCategory ||
                            request.defectCategory ||
                            "Unknown Category"}
                      </p>

                      {/* Show machine info */}
                      {(request.requestType === "add"
                        ? request.defectMachine
                        : request.operationDefect?.defectMachine) && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Machine:{" "}
                          {request.requestType === "add"
                            ? request.defectMachine
                            : request.operationDefect?.defectMachine}
                        </p>
                      )}

                      {/* Show reworkable status */}
                      {(request.requestType === "add"
                        ? request.defectReworkable
                        : request.operationDefect?.defectReworkable) ===
                        true && (
                        <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                          Reworkable
                        </p>
                      )}

                      <div className="mt-2 text-sm dark:text-gray-300">
                        <p>
                          Requested by: {request.requestedBy?.name || "Unknown"}
                        </p>
                        <p>Reason: {request.reason}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(request.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      {request.requestType !== "delete" && (
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              QTY
                            </div>
                            <div className="flex flex-col">
                              {request.requestType === "edit" && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 line-through">
                                  {request.currentQty}
                                </div>
                              )}
                              <div className="font-medium dark:text-white">
                                {request.requestedQty}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              RW
                            </div>
                            <div className="flex flex-col">
                              {request.requestType === "edit" && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 line-through">
                                  {request.currentRw}
                                </div>
                              )}
                              <div className="font-medium dark:text-white">
                                {request.requestedRw}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              NG
                            </div>
                            <div className="flex flex-col">
                              {request.requestType === "edit" && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 line-through">
                                  {request.currentNg}
                                </div>
                              )}
                              <div className="font-medium dark:text-white">
                                {request.requestedNg}
                              </div>
                            </div>
                          </div>
                          {/* Show Replacement values inline for OP10 operations */}
                          {request.operationCode?.toLowerCase() === "op10" && (
                            <div>
                              <div className="text-xs text-blue-500 dark:text-blue-400">
                                RP
                              </div>
                              <div className="flex flex-col">
                                {request.requestType === "edit" && (
                                  <div className="text-xs text-gray-400 dark:text-gray-500 line-through">
                                    {request.currentReplacement !== undefined
                                      ? request.currentReplacement
                                      : request.currentQty}
                                  </div>
                                )}
                                <div className="font-medium text-blue-600 dark:text-blue-400">
                                  {request.requestedReplacement !== undefined
                                    ? request.requestedReplacement
                                    : request.requestedQty}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {request.requestType === "delete" && (
                        <div className="text-sm font-medium text-red-500 dark:text-red-400 mb-2">
                          Request to delete this defect
                        </div>
                      )}

                      {isAdmin && (
                        <div className="flex flex-row gap-2 justify-end mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                            onClick={() =>
                              handleRequestAction(
                                request.id,
                                "rejected",
                                "Request rejected"
                              )
                            }
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-950/30 border-green-200 dark:border-green-800"
                            onClick={() =>
                              handleRequestAction(request.id, "approved")
                            }
                          >
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
