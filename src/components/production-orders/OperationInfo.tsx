import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";

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

interface OperationInfoProps {
  activeTab: string;
  operationStatus: string;
  operationStatuses: Record<string, OperationStatus>;
  rfValue: string;
  setRfValue: (value: string) => void;
  defects: OperationDefect[];
  isAdmin: boolean;
  orderData: any;
  isSubmitting: boolean;
  isCompletingOperation: boolean;
  isUpdatingDefects: boolean;
  showOperationAuditLog: boolean;
  showDefectAuditLog: boolean;
  setShowOperationAuditLog: (show: boolean) => void;
  setShowDefectAuditLog: (show: boolean) => void;
  handleStartOperation: () => void;
  handleCompleteOperation: () => void;
}

export function OperationInfo({
  activeTab,
  operationStatus,
  operationStatuses,
  rfValue,
  setRfValue,
  defects,
  isAdmin,
  orderData,
  isSubmitting,
  isCompletingOperation,
  isUpdatingDefects,
  showOperationAuditLog,
  showDefectAuditLog,
  setShowOperationAuditLog,
  setShowDefectAuditLog,
  handleStartOperation,
  handleCompleteOperation,
}: OperationInfoProps) {
  console.log(
    `Rendering OperationInfo for tab: ${activeTab}, status: ${operationStatus}`
  );
  const { data: session } = useSession();
  console.log("User role in OperationInfo:", session?.user?.role);

  return (
    <div className="bg-gray-50 dark:bg-black p-4 md:p-6 rounded-md">
      <h2 className="text-lg font-medium mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="dark:text-white">
            [{operationStatuses[activeTab]?.operationId}] Operation Information
          </span>
          {operationStatuses[activeTab]?.isCompleted && !isAdmin && (
            <div className="ml-2 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 text-xs px-2 py-1 rounded-md flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              View Only
            </div>
          )}
        </div>
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
          {operationStatus}
        </span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="border border-gray-200 dark:border-gray-800 rounded-md p-3 bg-white dark:bg-gray-950">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Start Time
          </label>
          <div className="text-sm font-medium dark:text-white">
            {activeTab && operationStatuses[activeTab]?.startTime
              ? new Date(
                  operationStatuses[activeTab].startTime as Date
                ).toLocaleString()
              : "Not started"}
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-800 rounded-md p-3 bg-white dark:bg-gray-950">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {operationStatuses[activeTab]?.endTime ? "End Time" : "Status"}
          </label>
          <div className="text-sm font-medium dark:text-white">
            {activeTab && operationStatuses[activeTab]?.endTime
              ? new Date(
                  operationStatuses[activeTab].endTime as Date
                ).toLocaleString()
              : operationStatuses[activeTab]?.isStarted
              ? "In progress"
              : "Not started"}
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-800 rounded-md p-3 bg-white dark:bg-gray-950">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Input Quantity
          </label>
          <div className="text-sm font-medium dark:text-white">
            {(activeTab && operationStatuses[activeTab]?.inputQuantity) || 0}
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-800 rounded-md p-3 bg-white dark:bg-gray-950">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Output Quantity
            {isUpdatingDefects && (
              <span className="ml-2 inline-block animate-pulse text-amber-500 dark:text-amber-400">
                Updating...
              </span>
            )}
          </label>
          <div className="text-sm font-medium text-purple-700 dark:text-purple-400">
            {activeTab && operationStatuses[activeTab]?.isStarted
              ? operationStatuses[activeTab]?.outputQuantity !== null
                ? operationStatuses[activeTab]?.outputQuantity
                : "Calculating..."
              : "-"}
          </div>

          {defects.filter((d) => d.quantity > 0).length > 0 && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Input:</span>
                <span>{operationStatuses[activeTab]?.inputQuantity || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Defects:</span>
                <span>{defects.reduce((sum, d) => sum + d.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Reworkable:</span>
                <span>
                  {defects.reduce(
                    (sum, d) => sum + (d.reworkable ? d.quantityRework : 0),
                    0
                  )}
                </span>
              </div>
              <div className="flex justify-between font-medium dark:text-gray-300">
                <span>Effective Loss:</span>
                <span>
                  {defects.reduce((sum, d) => {
                    return (
                      sum +
                      (d.reworkable
                        ? d.quantity - d.quantityRework
                        : d.quantity)
                    );
                  }, 0)}
                </span>
              </div>

              {/* Show Replacements for all operations, not just OP10 */}
              <div className="flex justify-between font-medium text-blue-600 dark:text-blue-400 mt-1">
                <span>Replacements:</span>
                <span>
                  {defects.reduce(
                    (sum, d) => sum + (d.quantityReplacement || 0),
                    0
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {operationStatuses[activeTab]?.isStarted &&
        !operationStatuses[activeTab]?.isCompleted && (
          <div className="border border-gray-200 dark:border-gray-800 rounded-md p-3 bg-white dark:bg-gray-950 col-span-1 sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Resource Factor (RF)
            </label>
            <Input
              type="number"
              min="1"
              className="mb-1 dark:bg-black"
              value={rfValue}
              onChange={(e) => setRfValue(e.target.value)}
              placeholder="Enter RF value"
            />
          </div>
        )}
      <div className="space-y-2">
        {!operationStatuses[activeTab]?.startTime &&
          session?.user?.role?.toLowerCase() !== "viewer" && (
            <Button
              onClick={handleStartOperation}
              className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white w-full"
              disabled={
                isSubmitting || (!isAdmin && orderData?.status === "completed")
              }
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <span className="animate-spin mr-2">⟳</span> Starting...
                </div>
              ) : (
                "Start Operation"
              )}
            </Button>
          )}

        {operationStatuses[activeTab]?.isStarted &&
          !operationStatuses[activeTab]?.isCompleted &&
          session?.user?.role?.toLowerCase() !== "viewer" && (
            <Button
              onClick={handleCompleteOperation}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white w-full"
              disabled={
                isCompletingOperation ||
                (!isAdmin && orderData?.status === "completed")
              }
            >
              End Operation
            </Button>
          )}
        {!isAdmin && operationStatuses[activeTab]?.isCompleted && (
          <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Admin access required to edit completed operations
          </div>
        )}
      </div>

      {/* Audit Log Links - Visible only to admin users */}
      {isAdmin && (
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Audit Logs:
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowOperationAuditLog(true)}
              className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 flex items-center"
              title="View Operation Audit Logs"
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
              Operation
            </button>
            <button
              onClick={() => setShowDefectAuditLog(true)}
              className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 flex items-center"
              title="View Defect Audit Logs"
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
              Defects
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
