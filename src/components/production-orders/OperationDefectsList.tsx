import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Trash2, AlertTriangle, Search, PlusCircle, Edit } from "lucide-react";
import { DefectEditRequestPopover } from "@/components/operation-defects/DefectEditRequestPopover";
import { Button } from "@/components/ui/button";
import { SearchMasterDefectsList } from "@/components/production-orders/SearchMasterDefectsList";
import { PendingDefectRequestsModal } from "@/components/operation-defects/PendingDefectRequestsModal";
import { UserSession } from "@/lib/clientAuth";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OperationDefect {
  id: string;
  name: string;
  category: string;
  reworkable: boolean;
  machine?: string;
  quantity: number;
  quantityRework: number;
  quantityNogood: number;
  quantityReplacement?: number;
  operationDefectId?: number | null;
}

interface OperationStatus {
  isStarted: boolean;
  isCompleted: boolean;
  inputQuantity: number;
  outputQuantity: number | null;
  startTime: Date | null;
  endTime: Date | null;
  operationId?: number;
}

interface OperationDefectsListProps {
  activeTab: string;
  defects: OperationDefect[];
  isAdmin: boolean;
  operationStatuses: Record<string, OperationStatus>;
  isUpdatingDefects: boolean;
  isLoadingDefects: boolean;
  poNumber: string | string[] | undefined;
  handleDefectQuantityChange: (
    defectId: string,
    field:
      | "quantity"
      | "quantityRework"
      | "quantityNogood"
      | "quantityReplacement",
    value: number
  ) => void;
  refreshDefectsForOperationCallback: () => void;
  selectedDefectId: string | null;
  selectedDefectName: string | null;
  setSelectedDefectId: (id: string | null) => void;
  setSelectedDefectName: (name: string | null) => void;
  setShowDefectItemAuditLog: (show: boolean) => void;
  deleteDefect?: (defectId: string) => void;
  masterDefects?: any[];
  isLoadingMasterDefects?: boolean;
  handleAddDefect?: (defectId: string) => void;
  existingDefects?: any[];
}

export function OperationDefectsList({
  activeTab,
  defects,
  isAdmin,
  operationStatuses,
  isUpdatingDefects,
  isLoadingDefects,
  poNumber,
  handleDefectQuantityChange,
  refreshDefectsForOperationCallback,
  selectedDefectId,
  selectedDefectName,
  setSelectedDefectId,
  setSelectedDefectName,
  setShowDefectItemAuditLog,
  deleteDefect,
  masterDefects,
  isLoadingMasterDefects,
  handleAddDefect,
  existingDefects,
}: OperationDefectsListProps) {
  const [defectToDelete, setDefectToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const { data: session } = useSession();

  console.log("User role in OperationDefectsList:", session?.user?.role);

  // Only show defects that have an operationDefectId (actually saved in the database)
  const recordedDefects = defects.filter(
    (defect) => defect.operationDefectId !== null
  );

  // Filter defects based on search term
  const filteredDefects =
    searchTerm.trim() === ""
      ? recordedDefects
      : recordedDefects.filter(
          (defect) =>
            defect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            defect.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (defect.machine &&
              defect.machine.toLowerCase().includes(searchTerm.toLowerCase()))
        );

  console.log(
    `Rendering OperationDefectsList for tab: ${activeTab}, defects count: ${recordedDefects.length}, filtered count: ${filteredDefects.length}`
  );

  // Fetch all pending requests count
  useEffect(() => {
    if (operationStatuses[activeTab]?.operationId) {
      fetchPendingRequestsCount();
    }
  }, [activeTab, operationStatuses]);

  const fetchPendingRequestsCount = async () => {
    try {
      const operationId = operationStatuses[activeTab]?.operationId;
      if (!operationId) return;

      const response = await fetch(
        `/api/operation-defect-edit-requests?operationId=${operationId}&status=pending&count=true`,
        {
          method: "GET",
          headers: {
            ...UserSession.getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch pending requests count (${response.status})`
        );
      }

      const data = await response.json();
      console.log("Pending requests count:", data.count);

      if (data.count !== undefined) {
        setPendingRequestsCount(data.count);
      }
    } catch (error) {
      console.error("Error fetching pending requests count:", error);
    }
  };

  const handleDeleteClick = (defectId: string) => {
    const defect = defects.find((d) => d.id === defectId);
    if (defect) {
      setDefectToDelete({
        id: defect.id,
        name: defect.name,
      });
    }
  };

  const confirmDelete = () => {
    if (defectToDelete && deleteDefect) {
      deleteDefect(defectToDelete.id);
      setDefectToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDefectToDelete(null);
  };

  return (
    <div>
      {/* Delete confirmation dialog */}
      <Dialog
        open={!!defectToDelete}
        onOpenChange={(open) => !open && setDefectToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the defect &quot;
              {defectToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Requests Modal */}
      <PendingDefectRequestsModal
        open={showPendingRequests}
        onClose={() => setShowPendingRequests(false)}
        operationId={operationStatuses[activeTab]?.operationId}
        operationCode={activeTab}
        poNumber={
          typeof poNumber === "string"
            ? poNumber
            : Array.isArray(poNumber)
            ? poNumber[0]
            : ""
        }
        onRefresh={() => {
          fetchPendingRequestsCount();
          refreshDefectsForOperationCallback();
        }}
        isAdmin={isAdmin}
      />

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          {/* Inline search field */}
          <div className="relative w-40">
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            </div>
            <Input
              type="search"
              placeholder="Search recorded..."
              className="h-7 pl-8 text-xs w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <h3 className="text-sm font-medium dark:text-white">
            Recorded Defects
          </h3>

          {/* Button to show pending requests */}
          {pendingRequestsCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 flex items-center gap-1 text-purple-600 dark:text-purple-400"
              onClick={() => setShowPendingRequests(true)}
            >
              <span>Pending Requests</span>
              <span className="bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300 text-xs font-medium px-2 py-0.5 rounded-full">
                {pendingRequestsCount}
              </span>
            </Button>
          )}
        </div>
        <div className="flex items-center">
          {isUpdatingDefects && (
            <span className="mr-2 text-amber-500 animate-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </span>
          )}
          <span className="text-sm font-medium dark:text-white">
            Total:{" "}
            {filteredDefects.reduce((sum, defect) => sum + defect.quantity, 0)}
          </span>
        </div>
      </div>

      {isLoadingDefects ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDefects.map((defect) => (
            <div
              key={defect.id}
              className="border-l-4 border-l-purple-400 bg-purple-50 dark:bg-black dark:border-l-purple-600 p-3 rounded-md shadow-sm transition-all hover:shadow relative"
            >
              {/* Add edit request popover only for completed operations and non-admin users */}
              {!isAdmin &&
                session?.user?.role?.toLowerCase() !== "viewer" &&
                operationStatuses[activeTab]?.isCompleted &&
                (() => {
                  console.log(
                    `Rendering DefectEditRequestPopover for defect:`,
                    {
                      id: defect.id,
                      name: defect.name,
                      category: defect.category,
                      machine: defect.machine,
                      operationId: operationStatuses[activeTab]?.operationId,
                      operationDefectId: defect.operationDefectId,
                    }
                  );
                  return (
                    <div className="absolute top-0 right-2 flex items-center">
                      {/* Show delete button for admin users even if popover is visible */}
                      {deleteDefect && isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 mr-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400 dark:hover:text-red-300"
                          onClick={() => handleDeleteClick(defect.id)}
                          title="Delete defect"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <DefectEditRequestPopover
                        defect={{
                          id: defect.id,
                          name: defect.name,
                          operationId:
                            operationStatuses[activeTab]?.operationId || 0,
                          operationDefectId: defect.operationDefectId,
                          defectName: defect.name,
                          defectCategory: defect.category,
                          defectMachine: defect.machine,
                          defectReworkable: defect.reworkable,
                          quantity: defect.quantity,
                          quantityRework: defect.quantityRework,
                          quantityNogood: defect.quantityNogood,
                        }}
                        operationCode={activeTab}
                        poNumber={poNumber as string}
                        onClose={refreshDefectsForOperationCallback}
                      />
                    </div>
                  );
                })()}

              {/* Show delete button in top right if no popover is shown */}
              {deleteDefect &&
                (isAdmin || !operationStatuses[activeTab]?.isCompleted) &&
                !(!isAdmin && operationStatuses[activeTab]?.isCompleted) && (
                  <div className="absolute top-0 right-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400 dark:hover:text-red-300"
                      onClick={() => handleDeleteClick(defect.id)}
                      title="Delete defect"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-1/2 pr-0 sm:pr-3 mb-3 sm:mb-0">
                  <div className="font-medium flex items-center">
                    <span className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full mr-2 flex-shrink-0"></span>
                    <div className="truncate dark:text-white">
                      {defect.operationDefectId
                        ? `#${defect.operationDefectId} - `
                        : ""}
                      [{defect.id}] {defect.name}
                    </div>
                    {isAdmin && defect.operationDefectId && (
                      <button
                        onClick={() => {
                          setSelectedDefectId(String(defect.operationDefectId));
                          setSelectedDefectName(defect.name);
                          setShowDefectItemAuditLog(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ml-2 flex-shrink-0 flex items-center"
                        title="View defect audit log"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {defect.category}
                  </div>
                  {defect.machine && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Machine: {defect.machine}
                    </div>
                  )}
                  {defect.reworkable === true && (
                    <div className="text-xs text-green-500 dark:text-green-400 mt-1 font-medium">
                      Reworkable
                    </div>
                  )}
                </div>

                <div
                  className={`w-full sm:w-1/2 grid ${
                    activeTab.toLowerCase() === "op10"
                      ? "grid-cols-4"
                      : "grid-cols-3"
                  } gap-2`}
                >
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      QTY
                    </div>
                    <div className="flex">
                      <Input
                        type="number"
                        min="0"
                        className={`h-8 border-purple-300 dark:border-purple-700 bg-white dark:bg-black ${
                          !isAdmin && operationStatuses[activeTab]?.isCompleted
                            ? "bg-gray-50 dark:bg-black/70"
                            : ""
                        }`}
                        value={defect.quantity}
                        onChange={(e) =>
                          handleDefectQuantityChange(
                            defect.id,
                            "quantity",
                            parseInt(e.target.value) || 0
                          )
                        }
                        disabled={
                          !isAdmin && operationStatuses[activeTab]?.isCompleted
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      RW
                    </div>
                    <Input
                      type="number"
                      min="0"
                      className={`h-8 ${
                        !defect.reworkable
                          ? "bg-gray-100 dark:bg-black/70"
                          : defect.quantityRework > 0
                          ? "border-green-300 dark:border-green-700 bg-white dark:bg-black"
                          : ""
                      } ${
                        !isAdmin && operationStatuses[activeTab]?.isCompleted
                          ? "bg-gray-50 dark:bg-black/70"
                          : ""
                      }`}
                      value={defect.quantityRework}
                      onChange={(e) =>
                        handleDefectQuantityChange(
                          defect.id,
                          "quantityRework",
                          parseInt(e.target.value) || 0
                        )
                      }
                      disabled={
                        !defect.reworkable ||
                        (!isAdmin && operationStatuses[activeTab]?.isCompleted)
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      NG
                    </div>
                    <Input
                      type="number"
                      min="0"
                      className={`h-8 ${
                        defect.quantityNogood > 0
                          ? "border-red-300 dark:border-red-700 bg-white dark:bg-black"
                          : ""
                      } ${
                        !defect.reworkable ? "bg-gray-100 dark:bg-black/70" : ""
                      } ${
                        !isAdmin && operationStatuses[activeTab]?.isCompleted
                          ? "bg-gray-50 dark:bg-black/70"
                          : ""
                      }`}
                      value={defect.quantityNogood}
                      onChange={(e) =>
                        handleDefectQuantityChange(
                          defect.id,
                          "quantityNogood",
                          parseInt(e.target.value) || 0
                        )
                      }
                      disabled={
                        !defect.reworkable ||
                        (!isAdmin && operationStatuses[activeTab]?.isCompleted)
                      }
                    />
                  </div>
                  {/* Show Replacement field only for OP10 */}
                  {activeTab.toLowerCase() === "op10" && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        RP
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max={defect.quantity}
                        className={`h-8 border-blue-300 dark:border-blue-700 bg-white dark:bg-black ${
                          !isAdmin && operationStatuses[activeTab]?.isCompleted
                            ? "bg-gray-50 dark:bg-black/70"
                            : ""
                        }`}
                        value={
                          defect.quantityReplacement !== undefined
                            ? defect.quantityReplacement > defect.quantity
                              ? defect.quantity
                              : defect.quantityReplacement
                            : activeTab.toLowerCase() === "op10"
                            ? defect.quantity
                            : 0
                        }
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          // Ensure value doesn't exceed quantity
                          const validValue = Math.min(value, defect.quantity);
                          console.log(
                            `RP input: ${value}, Max allowed: ${defect.quantity}, Using: ${validValue}`
                          );
                          handleDefectQuantityChange(
                            defect.id,
                            "quantityReplacement",
                            validValue
                          );
                        }}
                        disabled={
                          !isAdmin && operationStatuses[activeTab]?.isCompleted
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredDefects.length === 0 && (
            <div className="text-center py-6 bg-gray-50 dark:bg-black rounded-md border border-gray-200 dark:border-gray-800">
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  {searchTerm.trim() !== ""
                    ? "No defects match your search."
                    : "No defects recorded for this operation."}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {searchTerm.trim() !== ""
                    ? "Try a different search term."
                    : "Search for defects to add."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
