"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Head from "next/head";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import debounce from "lodash/debounce";
import { useSession } from "next-auth/react";
import { DefectEditRequestPopover } from "@/components/operation-defects/DefectEditRequestPopover";
import PageHeader from "@/components/layout/PageHeader";
import { AuditLogModal } from "@/components/audit-logs/AuditLogModal";
import { GetServerSidePropsContext } from "next";
import { BypassRenderer } from "@/components/BypassRenderer";
import { withServerSideAuth } from "@/lib/auth";
import { OperationInfo } from "@/components/production-orders/OperationInfo";
import { OperationDefectsList } from "@/components/production-orders/OperationDefectsList";
import { SearchMasterDefectsList } from "@/components/production-orders/SearchMasterDefectsList";
import { EndOperationModal } from "@/components/production-orders/EndOperationModal";
import { OrderDetailsForm } from "@/components/production-orders/OrderDetailsForm";
import { OperationTabs } from "@/components/production-orders/OperationTabs";
import { UserSession } from "@/lib/clientAuth";
import { Lock } from "lucide-react";

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

interface OperationStep {
  code: string;
  name: string;
  sequence: number;
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

interface ProductionOrder {
  id: string;
  poNumber: string;
  lotNumber: string | null;
  poQuantity: number;
  itemName: string | null;
  status: string;
  currentOperation: string | null;
  currentOperationStartTime: Date | null;
  currentOperationEndTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
  operations: any[]; // We'll type this more specifically if needed
  editingUserId?: number | null;
  editingUserName?: string | null;
  lockedAt?: Date | string | null;
}

interface RequestData {
  poNumber: string | string[] | undefined;
  operationCode: string;
  rf: string;
  defects: OperationDefect[];
  lineNo: string;
  timestamp?: string;
}

// Regular functions outside component to break circular dependencies
const fetchOperationStepsApi = async (
  getAuthHeaders: () => Record<string, string>
) => {
  console.log("Fetching operation steps");
  // Use the regular operation-steps endpoint now that we've fixed the conflict
  const response = await fetch("/api/operation-steps", {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    console.error("DIAGNOSTIC: API call to fetch operation steps failed", {
      status: response.status,
      statusText: response.statusText,
    });

    try {
      // Try to parse the error response
      const data = await response.json();
      console.error(
        "DIAGNOSTIC: Operation steps API error response data:",
        data
      );
      throw new Error(data.error || "Failed to fetch operation steps");
    } catch (jsonError) {
      // If we can't parse JSON, try to get text content
      console.error("DIAGNOSTIC: Could not parse JSON error response");
      try {
        const text = await response.text();
        console.error(
          "DIAGNOSTIC: Raw error response:",
          text.substring(0, 500)
        );
        throw new Error(
          `Failed to fetch operation steps: Response is not JSON. Status: ${response.status}`
        );
      } catch (textError) {
        // Handle text parsing errors
        console.error("DIAGNOSTIC: Error parsing response as text:", textError);
        throw new Error(
          `Failed to fetch operation steps: ${response.status} ${response.statusText}`
        );
      }
    }
  }

  try {
    const data = await response.json();
    console.log("Operation steps fetched:", data);
    return data;
  } catch (e) {
    console.error("DIAGNOSTIC: Error parsing successful response JSON:", e);
    try {
      const text = await response.text();
      console.error(
        "DIAGNOSTIC: Raw successful response:",
        text.substring(0, 500)
      );
    } catch (textError) {
      console.error("DIAGNOSTIC: Could not read raw response:", textError);
    }
    throw new Error("Failed to parse operation steps response");
  }
};

const fetchProductionOrderApi = async (
  poNumber: string,
  getAuthHeaders: () => Record<string, string>
) => {
  console.log("Fetching production order:", poNumber);

  const response = await fetch(`/api/production-orders/${poNumber}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    console.error("DIAGNOSTIC: API call to fetch production order failed", {
      status: response.status,
      statusText: response.statusText,
      poNumber,
    });

    // Handle 423 Locked status specially
    if (response.status === 423) {
      console.log("DIAGNOSTIC: Production order is locked");
      try {
        const data = await response.clone().json();
        console.error(
          "DIAGNOSTIC: Production order API error response data:",
          data
        );
        throw new Error(
          data.error ||
            "This production order is currently being edited by another user"
        );
      } catch (jsonError) {
        console.error(
          "DIAGNOSTIC: Could not parse locked response as JSON:",
          jsonError
        );
        throw new Error(
          `This production order is currently being edited by another user`
        );
      }
    }

    try {
      // Try to parse the error response, using response.clone() to avoid "body already read" errors
      const data = await response.clone().json();
      console.error(
        "DIAGNOSTIC: Production order API error response data:",
        data
      );
      throw new Error(data.error || "Failed to fetch production order");
    } catch (jsonError) {
      // If we can't parse JSON, try to get text content
      console.error("DIAGNOSTIC: Could not parse JSON error response");
      try {
        const text = await response.text();
        console.error(
          "DIAGNOSTIC: Raw error response:",
          text.substring(0, 500)
        );
        throw new Error(
          `Failed to fetch production order: Response is not JSON. Status: ${response.status}`
        );
      } catch (textError) {
        // Handle text parsing errors
        console.error("DIAGNOSTIC: Error parsing response as text:", textError);
        throw new Error(`Failed to fetch production order: ${response.status}`);
      }
    }
  }

  try {
    const data = await response.json();
    console.log("Production order fetched:", data);
    return data;
  } catch (e) {
    console.error("DIAGNOSTIC: Error parsing successful response JSON:", e);
    try {
      const text = await response.text();
      console.error(
        "DIAGNOSTIC: Raw successful response:",
        text.substring(0, 500)
      );
    } catch (textError) {
      console.error("DIAGNOSTIC: Could not read raw response:", textError);
    }
    throw new Error("Failed to parse production order response");
  }
};

const fetchDefectsForOperationApi = async (
  poNumber: string,
  operationCode: string,
  getAuthHeaders: () => Record<string, string>
) => {
  console.log("Fetching defects for operation:", operationCode);

  if (!poNumber || typeof poNumber !== "string") {
    throw new Error("Invalid PO number");
  }

  const response = await fetch(
    `/api/defects?operation=${operationCode}&poNumber=${poNumber}&active=true`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    try {
      const data = await response.json();
      throw new Error(data.error || "Failed to fetch defects");
    } catch (e) {
      // Handle JSON parsing errors
      console.error("Error parsing response JSON:", e);
      throw new Error(
        `Failed to fetch defects: ${response.status} ${response.statusText}`
      );
    }
  }

  try {
    const data = await response.json();
    console.log("Defects fetched for operation:", data);
    return data.data || [];
  } catch (e) {
    console.error("Error parsing successful response JSON:", e);
    throw new Error("Failed to parse defects response");
  }
};

// Add a render counter for debugging
let renderCounter = 0;

interface ProductionOrderDetailsProps {
  initialOrderData?: ProductionOrder;
  initialError?: string;
  initialErrorStatus?: number;
  poNumberFromServer?: string;
}

interface LockInfo {
  userId: number;
  userName: string;
  lockedAt: string;
}

export default function ProductionOrderDetails({
  initialOrderData,
  initialError,
  initialErrorStatus,
  poNumberFromServer,
}: ProductionOrderDetailsProps) {
  console.log(
    "RENDER: ProductionOrderDetails component rendering with initialData:",
    !!initialOrderData
  );

  // Track render count
  renderCounter++;
  console.log("RENDER COUNT: #" + renderCounter);

  // Get session data to log user role
  const { data: session } = useSession();
  const userRole = session?.user?.role || "unknown";
  const isAdmin = userRole.toLowerCase() === "admin";
  console.log("RENDER: User role:", userRole, "isAdmin:", isAdmin);

  const router = useRouter();
  const poNumber = poNumberFromServer || (router.query.poNumber as string);

  // Lock state variables
  const [isLockLoading, setIsLockLoading] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isLockOwner, setIsLockOwner] = useState<boolean>(false);
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null);
  const [isReleasingLock, setIsReleasingLock] = useState<boolean>(false);

  // Acquire lock function
  const acquireLock = useCallback(async () => {
    if (!poNumber || !session?.user?.id) return false;

    // Skip lock acquisition for viewers
    if (session?.user?.role?.toLowerCase() === "viewer") {
      console.log("Viewer role detected, bypassing lock acquisition");
      setIsLockLoading(false);
      return true;
    }

    try {
      setIsLockLoading(true);
      console.log(`Attempting to acquire lock for: ${poNumber}`);

      const response = await fetch("/api/locks/acquire", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceType: "productionOrder",
          resourceId: poNumber,
        }),
      });

      const data = await response.json();
      console.log("Lock acquisition response:", data);

      if (response.ok && data.success) {
        // Lock acquired or already owned
        setIsLocked(true);
        setIsLockOwner(true);
        setLockInfo(data.lockInfo);
        return true;
      } else if (response.status === 423) {
        // Locked by someone else
        setIsLocked(true);
        setIsLockOwner(false);
        setLockInfo(data.lockInfo);
        return false;
      } else {
        // Other error
        console.error("Lock acquisition failed:", data.error);
        return false;
      }
    } catch (error) {
      console.error("Error acquiring lock:", error);
      return false;
    } finally {
      setIsLockLoading(false);
    }
  }, [poNumber, session?.user?.id, session?.user?.role]);

  // Release lock function
  const releaseLock = useCallback(async () => {
    if (!poNumber) return;

    try {
      setIsReleasingLock(true);

      const response = await fetch("/api/locks/release", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceType: "productionOrder",
          resourceId: poNumber,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redirect to list page after releasing lock
        router.push("/production-orders");
      } else {
        console.error("Failed to release lock:", data.error);
      }
    } catch (error) {
      console.error("Error releasing lock:", error);
    } finally {
      setIsReleasingLock(false);
    }
  }, [poNumber, router]);

  // Force release lock function (admin only)
  const forceReleaseLock = useCallback(async () => {
    if (!poNumber || !isAdmin) return;

    try {
      setIsReleasingLock(true);

      const response = await fetch("/api/locks/force-release", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceType: "productionOrder",
          resourceId: poNumber,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Acquire the lock after force release
        const acquired = await acquireLock();
        if (acquired) {
          // Refresh the page to show editable view
          window.location.reload();
        } else {
          router.push("/production-orders");
        }
      } else {
        console.error("Failed to force release lock:", data.error);
      }
    } catch (error) {
      console.error("Error force releasing lock:", error);
    } finally {
      setIsReleasingLock(false);
    }
  }, [poNumber, isAdmin, acquireLock, router]);

  // Effect to acquire lock on mount
  useEffect(() => {
    if (poNumber && session?.user?.id) {
      acquireLock();
    }
  }, [poNumber, session?.user?.id, acquireLock]);

  // Render locked view if resource is locked by someone else
  if (
    isLocked &&
    !isLockOwner &&
    !isLockLoading &&
    session?.user?.role?.toLowerCase() !== "viewer"
  ) {
    return (
      <>
        <Head>
          <title>{`P-Chart System - Production Order ${poNumber} (Locked)`}</title>
        </Head>
        <DashboardLayout>
          <div className="py-6">
            <PageHeader
              title={`Production Order ${poNumber} (Locked)`}
              description={`This production order is currently locked by another user.`}
            />

            <div className="bg-white dark:bg-black p-6 rounded-lg shadow mb-4">
              <div className="border-l-4 border-amber-500 p-4 bg-amber-50 dark:bg-gray-900 mb-4">
                <div className="flex items-start">
                  <div className="mr-2 text-amber-500">
                    <Lock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-amber-800 font-semibold">
                      This production order is currently locked
                    </h3>
                    <p className="text-amber-700 mt-1">
                      {lockInfo
                        ? `This production order is being edited by ${
                            lockInfo.userName
                          } since ${new Date(
                            lockInfo.lockedAt
                          ).toLocaleString()}`
                        : "This production order is currently locked by another user."}
                    </p>
                    <div className="mt-3 flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => router.push("/production-orders")}
                      >
                        Return to List
                      </Button>

                      {isAdmin && (
                        <Button
                          variant="destructive"
                          onClick={forceReleaseLock}
                          disabled={isReleasingLock}
                        >
                          {isReleasingLock
                            ? "Releasing..."
                            : "Force Release Lock"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  if (isLockLoading) {
    return (
      <>
        <Head>
          <title>{`P-Chart System - Production Order ${poNumber}`}</title>
        </Head>
        <DashboardLayout>
          <div className="py-6">
            <PageHeader
              title={`Production Order - ${poNumber}`}
              description="Loading..."
            />
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  // Return full order details if we have the lock
  console.log("RENDER: Rendering full order details");
  return (
    <BypassRenderer>
      <ProductionOrderDetailsInner
        initialOrderData={initialOrderData}
        initialError={initialError}
        initialErrorStatus={initialErrorStatus}
        poNumberFromServer={poNumberFromServer}
        onReleaseLock={releaseLock}
        isReleasingLock={isReleasingLock}
      />
    </BypassRenderer>
  );
}

// Update the props to include lock-related props
interface ProductionOrderDetailsInnerProps extends ProductionOrderDetailsProps {
  onReleaseLock: () => Promise<void>;
  isReleasingLock: boolean;
}

// Inner component that contains all the actual functionality
function ProductionOrderDetailsInner({
  initialOrderData,
  initialError,
  initialErrorStatus,
  poNumberFromServer,
  onReleaseLock,
  isReleasingLock,
}: ProductionOrderDetailsInnerProps): JSX.Element {
  // Add a ref to track if we've already loaded the data
  const initialLoadRef = useRef(false);

  // Authentication and User Role
  const { isAuthorized, authError, getAuthHeaders, checkResponseAuth } =
    useAuth();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role?.toLowerCase() === "admin";
  console.log("AUTH: User role:", session?.user?.role, "Is admin?", isAdmin);

  const { toast } = useToast();
  const router = useRouter();
  const { newOrder } = router.query;
  const poNumber = poNumberFromServer || (router.query.poNumber as string);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("");
  const [operationStatus, setOperationStatus] = useState<string>("Not Started");
  const [error, setError] = useState<string | null>(initialError || null);
  const [orderData, setOrderData] = useState<ProductionOrder | null>(
    initialOrderData || null
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [operationSteps, setOperationSteps] = useState<OperationStep[]>([]);
  const [defects, setDefects] = useState<OperationDefect[]>([]);
  const [formData, setFormData] = useState({
    lotNumber: "",
    quantity: "",
    itemName: "",
  });
  const [operationStatuses, setOperationStatuses] = useState<
    Record<string, OperationStatus>
  >({});
  const [isCompletingOperation, setIsCompletingOperation] =
    useState<boolean>(false);
  const [rfValue, setRfValue] = useState<string>("1");
  const [isUpdatingDefects, setIsUpdatingDefects] = useState<boolean>(false);
  const [isDeletingDefect, setIsDeletingDefect] = useState<boolean>(false);
  const [shouldMoveToNextTab, setShouldMoveToNextTab] =
    useState<boolean>(false);
  const [lineNo, setLineNo] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>("");
  const [showEndOperationModal, setShowEndOperationModal] =
    useState<boolean>(false);
  const [showOperationAuditLog, setShowOperationAuditLog] =
    useState<boolean>(false);
  const [showDefectAuditLog, setShowDefectAuditLog] = useState<boolean>(false);
  const [orderLoaded, setOrderLoaded] = useState<boolean>(!!initialOrderData);
  const [loadedOrderNumber, setLoadedOrderNumber] = useState<string>(
    typeof poNumber === "string" ? (poNumber as string) : ""
  );
  const [lastFetchedTab, setLastFetchedTab] = useState<string | null>(null);
  const [showDefectItemAuditLog, setShowDefectItemAuditLog] =
    useState<boolean>(false);
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);
  const [selectedDefectName, setSelectedDefectName] = useState<string | null>(
    null
  );

  // Add a state for master defects (all defects for the operation)
  const [masterDefects, setMasterDefects] = useState<any[]>([]);
  const [isLoadingMasterDefects, setIsLoadingMasterDefects] =
    useState<boolean>(false);

  const fetchProductionOrder = useCallback(async () => {
    // Only fetch once - enhanced check
    if (initialLoadRef.current) {
      console.log(
        "Already performed initial data load, skipping redundant fetch"
      );
      return;
    }

    // Don't fetch if we already have initial data
    if (initialOrderData) {
      console.log("Initial order data provided, skipping API fetch");
      setOrderData(initialOrderData);
      setOrderLoaded(true);
      if (typeof poNumber === "string") {
        setLoadedOrderNumber(poNumber);
      }
      initialLoadRef.current = true;
      return;
    }

    // Don't fetch without a valid poNumber
    if (!poNumber || typeof poNumber !== "string") {
      console.log("No valid poNumber available, skipping fetch");
      return;
    }

    setError(null);
    console.log("Fetching production order:", poNumber);

    try {
      // Mark that we've started the initial load
      initialLoadRef.current = true;

      const response = await fetch(`/api/production-orders/${poNumber}`, {
        headers: getAuthHeaders(),
      });

      // Use our improved error handler for all status codes
      if (!checkResponseAuth(response)) {
        console.log("Response checking failed, aborting fetch");
        // Reset the ref so retry is possible
        initialLoadRef.current = false;
        return;
      }

      // Handle other response statuses
      if (!response.ok) {
        // Reset the ref so retry is possible
        initialLoadRef.current = false;
        try {
          // Try to parse the error response, using response.clone() to avoid "body already read" errors
          const data = await response.clone().json();
          console.error(
            "DIAGNOSTIC: Production order API error response data:",
            data
          );
          throw new Error(data.error || "Failed to fetch production order");
        } catch (jsonError) {
          // If we can't parse JSON, try to get text content
          console.error("DIAGNOSTIC: Could not parse JSON error response");
          try {
            const text = await response.text();
            console.error(
              "DIAGNOSTIC: Raw error response:",
              text.substring(0, 500)
            );
            throw new Error(
              `Failed to fetch production order: Response is not JSON. Status: ${response.status}`
            );
          } catch (textError) {
            // Handle text parsing errors
            console.error(
              "DIAGNOSTIC: Error parsing response as text:",
              textError
            );
            throw new Error(
              `Failed to fetch production order: ${response.status}`
            );
          }
        }
      }

      const data = await response.json();
      console.log("Production order fetched:", data);
      setOrderData(data);
      setOrderLoaded(true);
      if (typeof poNumber === "string") {
        setLoadedOrderNumber(poNumber);
      }
    } catch (error) {
      console.error("DIAGNOSTIC ERROR in fetchProductionOrder:", error);
      console.error("DIAGNOSTIC ERROR details:", error);

      // Reset the ref so retry is possible on user action
      initialLoadRef.current = false;

      // Handle network errors to prevent infinite retries
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error("Network error detected - unable to reach server");
        toast({
          title: "Network Error",
          description:
            "Unable to connect to the server. Please check your connection.",
          variant: "destructive",
        });
        return;
      }

      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );

      // Show a toast notification
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to fetch production order",
        variant: "destructive",
      });
    }
  }, [getAuthHeaders, poNumber, toast, checkResponseAuth, initialOrderData]);

  // Modify fetchDefectsForOperation to populate both defects and masterDefects
  const fetchDefectsForOperation = useCallback(
    async (operationCode: string, forceRefresh = false) => {
      // Enhanced validation to prevent unnecessary calls
      if (!operationCode || typeof operationCode !== "string") {
        console.log("Invalid operation code, skipping defects fetch");
        return;
      }

      // Skip if we've already fetched this tab and it hasn't changed
      if (lastFetchedTab === operationCode && !forceRefresh) {
        console.log(
          `Already fetched defects for ${operationCode}, skipping redundant fetch`
        );
        return;
      }

      // Check if we have a valid poNumber
      if (!poNumber || typeof poNumber !== "string") {
        console.log(
          "No valid poNumber available yet, will try again when it is available"
        );
        return;
      }

      // Immediately set the lastFetchedTab to prevent race conditions
      if (!forceRefresh) {
        setLastFetchedTab(operationCode);
      }

      try {
        // Add timeout to ensure state updates complete
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Double-check after waiting that we still need to fetch
        // This helps prevent race conditions where multiple fetches start in parallel
        if (lastFetchedTab === operationCode && !forceRefresh) {
          console.log(
            `After timeout check: already fetched defects for ${operationCode}, skipping redundant fetch`
          );
          return;
        }

        console.log(
          `Fetching defects for operation: ${operationCode}, PO: ${poNumber}`
        );

        // First, get the master list of all defects for this operation type
        setIsLoadingMasterDefects(true);
        const masterDefectsResponse = await fetch(
          `/api/defects?operation=${operationCode}&poNumber=${poNumber}&active=true`,
          {
            headers: getAuthHeaders(),
          }
        );

        // Use our improved error handler for all status codes
        if (!checkResponseAuth(masterDefectsResponse)) {
          console.log("Response checking failed, aborting defects fetch");
          setIsLoadingMasterDefects(false);
          // Reset lastFetchedTab so retry is possible
          if (!forceRefresh) {
            setLastFetchedTab(null);
          }
          return;
        }

        if (!masterDefectsResponse.ok) {
          const data = await masterDefectsResponse.json();
          setIsLoadingMasterDefects(false);
          // Reset lastFetchedTab so retry is possible
          if (!forceRefresh) {
            setLastFetchedTab(null);
          }
          throw new Error(data.error || "Failed to fetch defects");
        }

        const masterDefectsData = await masterDefectsResponse.json();
        console.log(
          `Fetched ${masterDefectsData.data.length} master defects for operation ${operationCode}`
        );
        setMasterDefects(masterDefectsData.data || []);
        setIsLoadingMasterDefects(false);

        // Then, get the operation defects (already recorded for this operation)
        const opId = operationStatuses[operationCode]?.operationId;

        if (opId) {
          console.log(`Fetching recorded defects for operation ID: ${opId}`);
          // Use POST method for fetching operation defects since GET is not allowed
          const opDefectsResponse = await fetch(`/api/operation-defects/list`, {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ operationId: opId }),
          });

          // Use our improved error handler for all status codes
          if (!checkResponseAuth(opDefectsResponse)) {
            console.log(
              "Response checking failed, aborting operation defects fetch"
            );
            return;
          }

          if (!opDefectsResponse.ok) {
            const data = await opDefectsResponse.json();
            throw new Error(data.error || "Failed to fetch operation defects");
          }

          // Define interface for operation defects response
          interface OpDefectsResponse {
            data?: Array<{
              defectId: string | number;
              quantity: number;
              quantityRework: number;
              quantityNogood: number;
              quantityReplacement?: number;
              [key: string]: any;
            }>;
            [key: string]: any;
          }

          let opDefects: OpDefectsResponse;
          try {
            opDefects = await opDefectsResponse.json();
            console.log(
              `Fetched ${
                opDefects.data?.length || 0
              } recorded defects for operation ${operationCode}`
            );

            // Debug the structure of the first operation defect
            if (opDefects.data && opDefects.data.length > 0) {
              console.log(
                "First operation defect structure:",
                JSON.stringify(opDefects.data[0], null, 2)
              );
            }

            // Merge the two datasets - set quantities for defects that have been recorded
            const mergedDefects = masterDefectsData.data.map((defect: any) => {
              // The property is 'defectId' not 'defect_id' in the operation-defects API response
              const recorded = opDefects.data?.find(
                (opDefect: any) =>
                  parseInt(opDefect.defectId) === parseInt(defect.id)
              );

              if (recorded) {
                console.log(
                  `Found recorded defect: ${defect.name} with quantity ${recorded.quantity}`
                );
                return {
                  ...defect,
                  quantity: recorded.quantity || 0,
                  quantityRework: recorded.quantityRework || 0,
                  quantityNogood: recorded.quantityNogood || 0,
                  quantityReplacement: recorded.quantityReplacement || 0,
                  operationDefectId: recorded.id || null, // Store the operation-defect record ID
                };
              }

              return {
                ...defect,
                quantity: 0,
                quantityRework: 0,
                quantityNogood: 0,
                quantityReplacement: 0,
                operationDefectId: null,
              };
            });

            // Log details for defects with quantity > 0
            const defectsWithQuantity = mergedDefects.filter(
              (d: any) => d.quantity > 0
            );
            console.log(
              "Defects with quantity > 0:",
              defectsWithQuantity.map((d: any) => ({
                id: d.id,
                name: d.name,
                quantity: d.quantity,
              }))
            );

            // Update the defects and lastFetchedTab in one go to avoid
            // intermediate state that could trigger additional renders
            setDefects(mergedDefects);
            setLastFetchedTab(operationCode);
          } catch (jsonError) {
            console.error(
              "Failed to parse operation defects response:",
              jsonError
            );
            // Just continue with master defects if we can't parse the operation defects
            setDefects(
              masterDefectsData.data.map((defect: any) => ({
                ...defect,
                quantity: 0,
                quantityRework: 0,
                quantityNogood: 0,
                quantityReplacement: 0,
                operationDefectId: null,
              }))
            );
            setLastFetchedTab(operationCode);
          }
        } else {
          // If there's no operation ID yet (e.g., operation not started), just use the master defects
          console.log(
            "No operation ID available, using master defects list only"
          );
          setDefects(
            masterDefectsData.data.map((defect: any) => ({
              ...defect,
              quantity: 0,
              quantityRework: 0,
              quantityNogood: 0,
              quantityReplacement: 0,
              operationDefectId: null,
            }))
          );
          setLastFetchedTab(operationCode);
        }
      } catch (error) {
        console.error("Error fetching defects:", error);
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        toast({
          title: "Error",
          description: `Failed to load defects: ${errorMessage}`,
          variant: "destructive",
        });
        // Set defects to empty array on error
        setDefects([]);
        setMasterDefects([]);
        setIsLoadingMasterDefects(false);
      }
    },
    [
      getAuthHeaders,
      lastFetchedTab,
      operationStatuses,
      poNumber,
      toast,
      checkResponseAuth,
    ]
  );

  // Add the missing handleTabChange function
  const handleTabChange = useCallback(
    async (value: string) => {
      console.log(`Tab changing from ${activeTab} to ${value}`);

      try {
        // If we're already on this tab, do nothing
        if (activeTab === value) {
          console.log("Tab already active, skipping change");
          return;
        }

        // Update the active tab state immediately
        setActiveTab(value);
        console.log(`Operation status for ${value}:`, operationStatuses[value]);

        // Add a guard to prevent fetching if this tab was already fetched
        // This is crucial for preventing infinite loops
        if (lastFetchedTab === value) {
          console.log(
            `Tab ${value} already has defects loaded, skipping fetch`
          );
          return;
        }

        // Check that we have a valid poNumber before trying to fetch defects
        if (!poNumber || typeof poNumber !== "string") {
          console.log(
            "PO number not available yet, will fetch defects when it becomes available"
          );
          return;
        }

        // Otherwise, manually load the defects right here instead of relying on useEffect
        console.log(`Loading defects for newly selected tab ${value}`);
        await fetchDefectsForOperation(value, true);
      } catch (error) {
        console.error("Error in handleTabChange:", error);
        toast({
          title: "Error",
          description: `Tab change error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
      }
    },
    [
      activeTab,
      fetchDefectsForOperation,
      lastFetchedTab,
      operationStatuses,
      poNumber,
      toast,
    ]
  );

  // Add the missing handleStartOperation function
  const handleStartOperation = useCallback(async () => {
    if (!poNumber || !activeTab || operationStatuses[activeTab]?.isStarted) {
      return;
    }

    try {
      console.log(`Starting operation ${activeTab} for PO: ${poNumber}`);
      setIsSubmitting(true);

      const response = await fetch("/api/operations/start", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poNumber,
          operationCode: activeTab,
        }),
      });

      // Use our improved error handler for all status codes
      if (!checkResponseAuth(response)) {
        console.log("Response checking failed, aborting operation start");
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start operation");
      }

      const updatedOrder = await response.json();
      setOrderData(updatedOrder);

      setOperationStatus("In Progress");

      toast({
        title: "Success",
        description: `${activeTab.toUpperCase()} operation started successfully!`,
      });
    } catch (error) {
      console.error("Error starting operation:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [activeTab, getAuthHeaders, operationStatuses, poNumber, toast]);

  // Add the missing handleCompleteOperation function
  const handleCompleteOperation = useCallback(async () => {
    // Don't allow changes if the user is not admin and operation is completed
    if (!isAdmin && operationStatuses[activeTab]?.isCompleted) {
      console.log("Non-admin user tried to edit a completed operation");
      toast({
        title: "Permission Denied",
        description: "Only admin users can edit completed operations",
        variant: "destructive",
      });
      return;
    }

    if (
      !poNumber ||
      !activeTab ||
      !operationStatuses[activeTab]?.isStarted ||
      operationStatuses[activeTab]?.isCompleted
    ) {
      return;
    }

    setShowEndOperationModal(true);
  }, [activeTab, isAdmin, operationStatuses, poNumber, toast]);

  // Define all callback functions at the top level
  const fetchOperationSteps = useCallback(async () => {
    if (initialLoadRef.current) {
      console.log("Already fetched operation steps, skipping");
      return;
    }

    try {
      console.log("DIAGNOSTIC: Starting fetchOperationStepsApi call");

      try {
        const response = await fetch("/api/operation-steps", {
          headers: getAuthHeaders(),
        });

        // Use our improved error handler for all status codes
        if (!checkResponseAuth(response)) {
          console.log("Response checking failed, aborting fetch");
          return;
        }

        if (!response.ok) {
          console.error(
            "DIAGNOSTIC: API call to fetch operation steps failed",
            {
              status: response.status,
              statusText: response.statusText,
            }
          );

          try {
            // Try to parse the error response
            const data = await response.json();
            console.error(
              "DIAGNOSTIC: Operation steps API error response data:",
              data
            );
            throw new Error(data.error || "Failed to fetch operation steps");
          } catch (jsonError) {
            // If we can't parse JSON, try to get text content
            console.error("DIAGNOSTIC: Could not parse JSON error response");
            try {
              const text = await response.text();
              console.error(
                "DIAGNOSTIC: Raw error response:",
                text.substring(0, 500)
              );
              throw new Error(
                `Failed to fetch operation steps: Response is not JSON. Status: ${response.status}`
              );
            } catch (textError) {
              // Handle text parsing errors
              console.error(
                "DIAGNOSTIC: Error parsing response as text:",
                textError
              );
              throw new Error(
                `Failed to fetch operation steps: ${response.status} ${response.statusText}`
              );
            }
          }
        }

        const data = await response.json();
        console.log("DIAGNOSTIC: fetchOperationStepsApi succeeded");
        console.log("Operation steps fetched:", data);
        setOperationSteps(data);
        initialLoadRef.current = true;
      } catch (apiError: any) {
        console.error("DIAGNOSTIC ERROR in fetchOperationStepsApi:", apiError);
        console.error("DIAGNOSTIC ERROR details:", {
          message: apiError.message,
          stack: apiError.stack,
          name: apiError.name,
        });

        // Check if this is a JSON parsing error
        if (apiError.message && apiError.message.includes("JSON")) {
          console.error(
            "DIAGNOSTIC: JSON parsing error detected in fetchOperationStepsApi"
          );

          // Log the raw response if possible
          if (apiError.response) {
            try {
              const text = await apiError.response.text();
              console.error(
                "DIAGNOSTIC: Raw response body:",
                text.substring(0, 500)
              );
            } catch (e) {
              console.error("DIAGNOSTIC: Could not read raw response:", e);
            }
          }
        }

        throw apiError;
      }
    } catch (error) {
      console.error("Error fetching operation steps:", error);
      setError("Failed to fetch operation steps");
    }
  }, [getAuthHeaders, toast, checkResponseAuth]);

  // Define the sendDefectUpdate function first, before it's used by other functions
  const sendDefectUpdate = useCallback(
    debounce(async (defect: OperationDefect) => {
      if (!poNumber || !activeTab) return;

      console.log(
        `Sending defect update to server: ${defect.name}, quantity: ${defect.quantity}`
      );
      setIsUpdatingDefects(true);

      try {
        const response = await fetch("/api/operation-defects", {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            poNumber,
            operationCode: activeTab,
            defect,
          }),
        });

        // Use our improved error handler for all status codes
        if (!checkResponseAuth(response)) {
          console.log("Response checking failed, aborting defect update");
          setIsUpdatingDefects(false);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update defect");
        }

        const updatedOrder = await response.json();
        console.log("Defect update successful, updated order:", updatedOrder);

        setOrderData(updatedOrder);

        const statuses: Record<string, OperationStatus> = {};

        operationSteps.forEach((step) => {
          statuses[step.code.toLowerCase()] = {
            isStarted: false,
            isCompleted: false,
            inputQuantity: 0,
            outputQuantity: null,
            startTime: null,
            endTime: null,
          };
        });

        updatedOrder.operations.forEach((operation: any) => {
          const opCode = operation.operation.toLowerCase();
          statuses[opCode] = {
            isStarted: !!operation.startTime,
            isCompleted: !!operation.endTime,
            inputQuantity: operation.inputQuantity,
            outputQuantity: operation.outputQuantity,
            startTime: operation.startTime
              ? new Date(operation.startTime)
              : null,
            endTime: operation.endTime ? new Date(operation.endTime) : null,
            operationId: operation.id,
          };
        });

        setOperationStatuses(statuses);

        // We're updating the defects manually, so we should update lastFetchedTab
        // to avoid redundant fetching on subsequent operations
        setLastFetchedTab(activeTab);
      } catch (error) {
        console.error("Error updating defect:", error);
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsUpdatingDefects(false);
      }
    }, 500),
    [
      activeTab,
      getAuthHeaders,
      operationSteps,
      poNumber,
      toast,
      checkResponseAuth,
    ]
  );

  // Now define handleDefectQuantityChange which uses sendDefectUpdate
  const handleDefectQuantityChange = useCallback(
    (
      defectId: string,
      field:
        | "quantity"
        | "quantityRework"
        | "quantityNogood"
        | "quantityReplacement",
      value: number
    ) => {
      // Don't allow changes if the user is not admin and operation is completed
      if (!isAdmin && operationStatuses[activeTab]?.isCompleted) {
        console.log(
          "Non-admin user tried to edit a completed operation defect"
        );
        toast({
          title: "Permission Denied",
          description: "Only admin users can edit completed operations",
          variant: "destructive",
        });
        return;
      }

      // Ensure value is not negative
      const safeValue = Math.max(0, value);

      setDefects((prevDefects) =>
        prevDefects.map((defect) => {
          if (defect.id === defectId) {
            const updatedDefect = { ...defect };

            if (field === "quantity") {
              updatedDefect.quantity = safeValue;
              updatedDefect.quantityNogood = safeValue;
              updatedDefect.quantityRework = 0;
              // If in OP10, also update the replacement quantity to match
              if (activeTab.toLowerCase() === "op10") {
                updatedDefect.quantityReplacement = safeValue;
              }
              console.log(
                `QTY updated: QTY=${safeValue}, NG=${safeValue}, RW=0${
                  activeTab.toLowerCase() === "op10" ? `, RP=${safeValue}` : ""
                }`
              );
            }

            if (field === "quantityNogood") {
              const cappedValue = Math.min(safeValue, defect.quantity);
              updatedDefect.quantityNogood = cappedValue;
              updatedDefect.quantityRework = defect.quantity - cappedValue;
              console.log(
                `NG updated: QTY=${defect.quantity}, NG=${cappedValue}, RW=${updatedDefect.quantityRework}`
              );
            }

            if (field === "quantityRework") {
              const cappedValue = Math.min(safeValue, defect.quantity);
              updatedDefect.quantityRework = cappedValue;
              updatedDefect.quantityNogood = defect.quantity - cappedValue;
              console.log(
                `RW updated: QTY=${defect.quantity}, NG=${updatedDefect.quantityNogood}, RW=${cappedValue}`
              );
            }

            if (field === "quantityReplacement") {
              // Only allow setting quantityReplacement for OP10
              if (activeTab.toLowerCase() === "op10") {
                updatedDefect.quantityReplacement = safeValue;
                console.log(`RP updated: RP=${safeValue}`);
              } else {
                updatedDefect.quantityReplacement = 0;
                console.log(`RP update ignored for non-OP10 operation`);
              }
            }

            if (activeTab && operationStatuses[activeTab]?.isStarted) {
              sendDefectUpdate(updatedDefect);
            }

            return updatedDefect;
          }
          return defect;
        })
      );
    },
    [activeTab, isAdmin, operationStatuses, sendDefectUpdate, toast]
  );

  // Define all other callback functions at the top level
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData({
        ...formData,
        [name]: value,
      });
    },
    [formData]
  );

  const handleUpdate = useCallback(async () => {
    // Don't allow changes if the user is not admin
    if (!isAdmin) {
      console.log("Non-admin user tried to edit a production order");
      toast({
        title: "Permission Denied",
        description: "Only admin users can edit production orders",
        variant: "destructive",
      });
      return;
    }

    if (!poNumber || !orderData) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/production-orders/${poNumber}`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lotNumber: formData.lotNumber,
          quantity: formData.quantity,
          itemName: formData.itemName,
        }),
      });

      // Use our improved error handler for all status codes
      if (!checkResponseAuth(response)) {
        console.log("Response checking failed, aborting order update");
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update production order");
      }

      const updatedOrder = await response.json();
      setOrderData(updatedOrder);

      toast({
        title: "Success",
        description: "Production order updated successfully!",
      });
    } catch (error) {
      console.error("Error updating production order:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, getAuthHeaders, isAdmin, orderData, poNumber, toast]);

  // Add new handleAddDefect function to add a defect from search
  const handleAddDefect = useCallback(
    async (defectId: string) => {
      // Don't allow changes if the user is not admin and operation is completed
      if (!isAdmin && operationStatuses[activeTab]?.isCompleted) {
        console.log(
          "Non-admin user tried to add a defect to a completed operation"
        );
        toast({
          title: "Permission Denied",
          description: "Only admin users can edit completed operations",
          variant: "destructive",
        });
        return;
      }

      if (!poNumber || !activeTab || !operationStatuses[activeTab]?.isStarted) {
        toast({
          title: "Operation Not Started",
          description: "Please start the operation before adding defects",
          variant: "destructive",
        });
        return;
      }

      try {
        console.log(`Adding defect ${defectId} to operation ${activeTab}`);
        setIsUpdatingDefects(true);

        // Find the defect in the master list
        const defect = masterDefects.find((d) => d.id === defectId);
        if (!defect) {
          throw new Error("Defect not found in master list");
        }

        // Create a new defect object with quantity set to 1
        const newDefect = {
          ...defect,
          quantity: 1,
          quantityRework: 0,
          quantityNogood: 1,
        };

        // Call the API to save the defect
        const response = await fetch("/api/operation-defects", {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            poNumber,
            operationCode: activeTab,
            defect: newDefect,
          }),
        });

        // Use our improved error handler for all status codes
        if (!checkResponseAuth(response)) {
          console.log("Response checking failed, aborting defect add");
          setIsUpdatingDefects(false);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add defect");
        }

        // Get the updated order data
        const updatedOrder = await response.json();
        console.log("Defect added successfully, updated order:", updatedOrder);

        // Update the order data
        setOrderData(updatedOrder);

        // Refresh the defects list
        await fetchDefectsForOperation(activeTab, true);

        toast({
          title: "Success",
          description: `Added ${defect.name} to operation`,
        });
      } catch (error) {
        console.error("Error adding defect:", error);
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsUpdatingDefects(false);
      }
    },
    [
      activeTab,
      fetchDefectsForOperation,
      getAuthHeaders,
      isAdmin,
      masterDefects,
      operationStatuses,
      poNumber,
      toast,
      checkResponseAuth,
    ]
  );

  // Add the refreshDefectsForOperationCallback function
  const refreshDefectsForOperationCallback = useCallback(() => {
    console.log("refreshDefectsForOperationCallback called");
    // This is a noop function to prevent infinite loops
    // Don't actually call refreshDefectsForOperation
  }, []); // Empty dependency array ensures this function reference never changes

  // Define all useEffect hooks at the top level
  useEffect(() => {
    console.log("EFFECT: fetchOperationSteps effect running");
    fetchOperationSteps();
    return () => console.log("EFFECT: fetchOperationSteps cleanup");
  }, [fetchOperationSteps]);

  useEffect(() => {
    console.log("EFFECT: Initial tab setting effect", {
      operationStepsLength: operationSteps.length,
      activeTab: activeTab,
    });

    if (operationSteps.length > 0 && !activeTab) {
      console.log(
        "EFFECT: Initial tab setting to:",
        operationSteps[0].code.toLowerCase()
      );
      // Just set the active tab but don't trigger any loading - the tab-related useEffect will handle that
      setActiveTab(operationSteps[0].code.toLowerCase());
    }

    return () => console.log("EFFECT: Initial tab setting cleanup");
  }, [operationSteps, activeTab]);

  useEffect(() => {
    console.log("EFFECT: Defect loading check effect", {
      activeTab,
      lastFetchedTab,
      poNumber,
    });

    // Only run if we have an active tab but haven't loaded defects for it yet
    if (activeTab && lastFetchedTab !== activeTab && poNumber) {
      console.log(
        "EFFECT: Initial defect load triggered for active tab:",
        activeTab
      );

      if (poNumber && typeof poNumber === "string") {
        console.log(
          "EFFECT: Triggering initial defect load for tab:",
          activeTab
        );
        fetchDefectsForOperation(activeTab, true);
      }
    } else {
      console.log("EFFECT: Skipping defect load:", {
        activeTab,
        lastFetchedTab,
        havePoNumber: !!poNumber && typeof poNumber === "string",
      });
    }

    return () => console.log("EFFECT: Defect loading check cleanup");
  }, [activeTab, fetchDefectsForOperation, lastFetchedTab, poNumber]);

  useEffect(() => {
    if (orderData) {
      console.log("OrderData updated", orderData);

      // Set form data from order data
      setFormData({
        lotNumber: orderData.lotNumber || "",
        quantity: orderData.poQuantity.toString(),
        itemName: orderData.itemName || "",
      });

      // Set operation status based on current operation
      if (orderData.operations && orderData.currentOperation) {
        // Only set active tab if no tab is set or from localStorage if this is page load
        const lastUpdateType = localStorage.getItem("lastUpdateType");
        const isPageLoad = !lastUpdateType || lastUpdateType === "pageLoad";

        if ((!activeTab || isPageLoad) && !lastFetchedTab) {
          const opCode = orderData.currentOperation.toLowerCase();
          console.log("Setting active tab to current operation:", opCode);
          setActiveTab(opCode);

          // After setting the active tab, log that we need to load defects, but don't do it here
          console.log("INIT PAGE LOAD - Will trigger defect load for", opCode);
        }
      }
    }
  }, [orderData, activeTab, lastFetchedTab]);

  useEffect(() => {
    if (!orderData || !orderData.operations || operationSteps.length === 0) {
      return;
    }

    // Only update operation statuses, not other values
    console.log("Updating operation statuses based on order data:", orderData);
    const statuses: Record<string, OperationStatus> = {};

    // Initialize all operations with default values
    operationSteps.forEach((step) => {
      const code = step.code.toLowerCase();
      console.log(`Initialized status for ${code}:`, {
        isStarted: false,
        isCompleted: false,
        inputQuantity: 0,
        outputQuantity: null,
        startTime: null,
        endTime: null,
      });

      statuses[code] = {
        isStarted: false,
        isCompleted: false,
        inputQuantity: 0,
        outputQuantity: null,
        startTime: null,
        endTime: null,
      };
    });

    // Update with actual values from operations data
    orderData.operations.forEach((operation: any) => {
      const opCode = operation.operation.toLowerCase();

      const updatedStatus = {
        isStarted: !!operation.startTime,
        isCompleted: !!operation.endTime,
        inputQuantity: operation.inputQuantity,
        outputQuantity: operation.outputQuantity,
        startTime: operation.startTime ? new Date(operation.startTime) : null,
        endTime: operation.endTime ? new Date(operation.endTime) : null,
        operationId: operation.id,
      };

      console.log(`Updated status for ${opCode}:`, updatedStatus);
      statuses[opCode] = updatedStatus;
    });

    console.log("Final operation statuses:", statuses);
    setOperationStatuses(statuses);

    // Update operation status for current operation
    if (orderData.currentOperation) {
      const currentOpCode = orderData.currentOperation.toLowerCase();
      console.log(
        "Current operation:",
        currentOpCode,
        "Status:",
        statuses[currentOpCode]
      );

      if (
        statuses[currentOpCode]?.isStarted &&
        !statuses[currentOpCode]?.isCompleted
      ) {
        setOperationStatus("In Progress");
      } else if (statuses[currentOpCode]?.isCompleted) {
        setOperationStatus("Completed");
      } else {
        setOperationStatus("Not Started");
      }
    } else {
      setOperationStatus("Not Started");
    }
  }, [orderData, operationSteps]);

  useEffect(() => {
    if (authError) {
      toast({
        title: "Authentication Error",
        description: authError,
        variant: "destructive",
      });
    }
  }, [authError, toast]);

  // Enhanced effect to fetch production order data with better dependency management
  useEffect(() => {
    console.log("EFFECT: Main production order fetch effect triggered", {
      poNumber,
      hasInitialData: !!initialOrderData,
      alreadyLoaded: initialLoadRef.current,
      orderLoaded,
      loadedOrderNumber,
    });

    // Early returns to prevent unnecessary fetches
    if (initialLoadRef.current) {
      console.log("Already fetched data, skipping");
      return;
    }

    if (initialOrderData) {
      console.log("Using provided initial data, skipping fetch");
      setOrderData(initialOrderData);
      setOrderLoaded(true);
      if (typeof poNumber === "string") {
        setLoadedOrderNumber(poNumber);
      }
      initialLoadRef.current = true;
      return;
    }

    if (!poNumber || typeof poNumber !== "string") {
      console.log("No valid poNumber available, waiting...");
      return;
    }

    if (orderLoaded && loadedOrderNumber === poNumber) {
      console.log("Order already loaded for this poNumber, skipping");
      return;
    }

    console.log("Triggering production order fetch for:", poNumber);
    fetchProductionOrder();
  }, [
    poNumber,
    initialOrderData,
    orderLoaded,
    loadedOrderNumber,
    fetchProductionOrder,
  ]);

  useEffect(() => {
    console.log("EFFECT: localStorage effect running");
    localStorage.setItem("lastUpdateType", "pageLoad");

    return () => {
      console.log("EFFECT: localStorage effect cleanup");
      localStorage.removeItem("lastUpdateType");
    };
  }, []);

  // Add router ready effect with handleRouteChange defined
  useEffect(() => {
    // Return immediately if we already have data
    if (initialOrderData || initialLoadRef.current) {
      console.log("Router ready effect: already have data, skipping fetch");
      return;
    }

    const handleRouteChange = () => {
      console.log(
        "Router is ready, checking for poNumber:",
        router.query.poNumber
      );
      const routerPoNumber = router.query.poNumber;

      // Skip if we already have data or are loading
      if (initialLoadRef.current) {
        console.log("Skipping router ready effect: already fetched data");
        return;
      }

      if (
        routerPoNumber &&
        typeof routerPoNumber === "string" &&
        !initialLoadRef.current
      ) {
        console.log("Router is ready with poNumber:", routerPoNumber);
        fetchProductionOrder();
      }
    };

    // Check if the router is already ready
    if (router.isReady) {
      handleRouteChange();
    }

    // Subscribe to router events
    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router, fetchProductionOrder, initialOrderData, initialLoadRef]);

  // Define the deleteDefect function
  const deleteDefect = useCallback(
    async (defectId: string) => {
      // Don't allow changes if the user is not admin and operation is completed
      if (!isAdmin && operationStatuses[activeTab]?.isCompleted) {
        console.log(
          "Non-admin user tried to delete a defect in a completed operation"
        );
        toast({
          title: "Permission Denied",
          description: "Only admin users can edit completed operations",
          variant: "destructive",
        });
        return;
      }

      if (!poNumber || !activeTab || !operationStatuses[activeTab]?.isStarted) {
        return;
      }

      try {
        console.log(`Deleting defect ${defectId} from operation ${activeTab}`);
        setIsDeletingDefect(true);

        // Find the defect to get its operation defect ID
        const defect = defects.find((d) => d.id === defectId);
        if (!defect) {
          throw new Error("Defect not found");
        }

        // If the defect has no operation defect ID, just remove it from the UI
        if (!defect.operationDefectId) {
          setDefects((prevDefects) =>
            prevDefects.filter((d) => d.id !== defectId)
          );
          console.log("Defect was not saved to server, removed from UI only");
          return;
        }

        // Call API to delete the defect
        const response = await fetch(
          `/api/operation-defects/${defect.operationDefectId}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          }
        );

        // Use our improved error handler for all status codes
        if (!checkResponseAuth(response)) {
          console.log("Response checking failed, aborting defect deletion");
          setIsDeletingDefect(false);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete defect");
        }

        console.log("Defect deleted successfully");

        // Refresh defects for the operation
        await fetchDefectsForOperation(activeTab, true);

        toast({
          title: "Success",
          description: `Defect deleted successfully`,
        });
      } catch (error) {
        console.error("Error deleting defect:", error);
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsDeletingDefect(false);
      }
    },
    [
      activeTab,
      defects,
      fetchDefectsForOperation,
      getAuthHeaders,
      isAdmin,
      operationStatuses,
      poNumber,
      toast,
      checkResponseAuth,
    ]
  );

  // Add submitCompleteOperation callback
  const submitCompleteOperation = useCallback(async () => {
    if (!lineNo) {
      toast({
        title: "Error",
        description: "Line Number is required",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(
        `Completing operation ${activeTab} for PO: ${poNumber} with Line No: ${lineNo}`
      );
      setIsCompletingOperation(true);

      setShouldMoveToNextTab(true);

      localStorage.setItem("lastUpdateType", "operationComplete");

      // Include all defects instead of just those with quantity > 0
      // This change allows zero-quantity defects to be preserved
      const requestData: RequestData = {
        poNumber,
        operationCode: activeTab,
        rf: rfValue,
        defects: defects, // Send all defects instead of filtering
        lineNo: lineNo,
      };

      if (timestamp) {
        requestData.timestamp = timestamp;
        console.log(`Including custom timestamp: ${timestamp}`);
      }

      const response = await fetch("/api/operations/complete", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      // Use our improved error handler for all status codes
      if (!checkResponseAuth(response)) {
        console.log("Response checking failed, aborting operation completion");
        setIsCompletingOperation(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete operation");
      }

      const updatedOrder = await response.json();
      setOrderData(updatedOrder);
      setOperationStatus("Completed");

      if (updatedOrder.currentOperation) {
        const nextOpCode = updatedOrder.currentOperation.toLowerCase();
        console.log(`Moving to next operation: ${nextOpCode}`);

        // When changing tabs, reset the lastFetchedTab to ensure we load
        // fresh defect data for the new operation
        setLastFetchedTab(null);

        setActiveTab(nextOpCode);

        console.log(`Force fetching defects for next operation: ${nextOpCode}`);
        fetchDefectsForOperation(nextOpCode);

        // Automatically start the next operation
        console.log(`Auto-starting next operation: ${nextOpCode}`);
        try {
          const startResponse = await fetch("/api/operations/start", {
            method: "POST",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              poNumber,
              operationCode: nextOpCode,
            }),
          });

          // Use our improved error handler for all status codes
          if (!checkResponseAuth(startResponse)) {
            console.log("Response checking failed, aborting auto-start");
            setOperationStatus("Not Started");
            return;
          }

          if (!startResponse.ok) {
            const errorData = await startResponse.json();
            console.error(
              "Failed to auto-start next operation:",
              errorData.error
            );
            setOperationStatus("Not Started");
            toast({
              title: "Warning",
              description: `Moved to ${nextOpCode.toUpperCase()} but failed to auto-start: ${
                errorData.error
              }`,
              variant: "destructive",
            });
            return;
          }

          const autoStartedOrder = await startResponse.json();
          setOrderData(autoStartedOrder);
          setOperationStatus("In Progress");

          toast({
            title: "Success",
            description: `${nextOpCode.toUpperCase()} operation started automatically!`,
          });
        } catch (autoStartError) {
          console.error("Error auto-starting next operation:", autoStartError);
          setOperationStatus("Not Started");
          toast({
            title: "Warning",
            description: `Moved to ${nextOpCode.toUpperCase()} but failed to auto-start. Please start manually.`,
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Success",
        description: `${activeTab.toUpperCase()} operation completed successfully!`,
      });

      setRfValue("1");
      setLineNo("");
      setTimestamp("");
      setShowEndOperationModal(false);
    } catch (error) {
      console.error("Error completing operation:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCompletingOperation(false);
    }
  }, [
    activeTab,
    defects,
    fetchDefectsForOperation,
    getAuthHeaders,
    lineNo,
    poNumber,
    rfValue,
    timestamp,
    toast,
    checkResponseAuth,
  ]);

  return (
    <>
      <Head>
        <title>{`P-Chart System - Production Order ${
          typeof poNumber === "string" ? poNumber : ""
        }`}</title>
      </Head>
      <DashboardLayout>
        <div className="py-6">
          <PageHeader
            title={`Production Order - ${poNumber}`}
            actions={
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <div className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-md">
                    Admin Mode
                  </div>
                )}
                {session?.user?.role?.toLowerCase() === "viewer" && (
                  <>
                    <div className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-md">
                      Viewer Mode
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/production-orders")}
                      className="mr-2"
                    >
                      Back to List
                    </Button>
                  </>
                )}
                {session?.user?.role?.toLowerCase() !== "viewer" && (
                  <Button
                    variant="outline"
                    onClick={onReleaseLock}
                    disabled={isReleasingLock}
                    className="mr-2"
                  >
                    {isReleasingLock ? "Releasing..." : "Release Lock"}
                  </Button>
                )}
              </div>
            }
          />

          {/* Use OrderDetailsForm component */}
          <OrderDetailsForm
            poNumber={poNumber}
            formData={formData}
            handleChange={handleChange}
            handleUpdate={handleUpdate}
            isSubmitting={isSubmitting}
            isAdmin={isAdmin}
            session={session}
            orderData={orderData}
          />

          <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b">
              <Tabs
                defaultValue={activeTab}
                value={activeTab}
                onValueChange={handleTabChange}
              >
                <div className="overflow-x-auto pb-1">
                  {/* Use OperationTabs component */}
                  <OperationTabs
                    operationSteps={operationSteps}
                    activeTab={activeTab}
                    operationStatuses={operationStatuses}
                    isAdmin={isAdmin}
                    handleTabChange={handleTabChange}
                  />
                </div>

                {operationSteps.length > 0 ? (
                  operationSteps.map((step) => (
                    <TabsContent
                      key={step.code}
                      value={step.code.toLowerCase()}
                      className="py-4"
                    >
                      {operationStatuses[step.code.toLowerCase()]?.isStarted ||
                      step.code.toLowerCase() === "op10" ||
                      (operationSteps.findIndex(
                        (op) =>
                          op.code.toLowerCase() === step.code.toLowerCase()
                      ) > 0 &&
                        operationStatuses[
                          operationSteps[
                            operationSteps.findIndex(
                              (op) =>
                                op.code.toLowerCase() ===
                                step.code.toLowerCase()
                            ) - 1
                          ].code.toLowerCase()
                        ]?.isCompleted) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                          {/* Use OperationInfo component */}
                          <OperationInfo
                            activeTab={activeTab}
                            operationStatus={operationStatus}
                            operationStatuses={operationStatuses}
                            rfValue={rfValue}
                            setRfValue={setRfValue}
                            defects={defects}
                            isAdmin={isAdmin}
                            orderData={orderData}
                            isSubmitting={isSubmitting}
                            isCompletingOperation={isCompletingOperation}
                            isUpdatingDefects={isUpdatingDefects}
                            showOperationAuditLog={showOperationAuditLog}
                            showDefectAuditLog={showDefectAuditLog}
                            setShowOperationAuditLog={setShowOperationAuditLog}
                            setShowDefectAuditLog={setShowDefectAuditLog}
                            handleStartOperation={handleStartOperation}
                            handleCompleteOperation={handleCompleteOperation}
                          />

                          <div className="flex flex-col space-y-6">
                            {/* Use SearchMasterDefectsList for searching defects */}
                            <SearchMasterDefectsList
                              activeTab={activeTab}
                              masterDefects={masterDefects}
                              isAdmin={isAdmin}
                              operationStatuses={operationStatuses}
                              isLoading={isLoadingMasterDefects}
                              handleAddDefect={handleAddDefect}
                              existingDefects={defects
                                .filter(
                                  (d) => d.quantity > 0 || d.operationDefectId
                                )
                                .map((d) => ({
                                  id: d.id,
                                  defectId: d.id,
                                  operationId:
                                    operationStatuses[activeTab]?.operationId ||
                                    0,
                                }))}
                              poNumber={poNumber}
                              refreshDefectsForOperationCallback={
                                refreshDefectsForOperationCallback
                              }
                            />

                            {/* Use OperationDefectsList for displaying recorded defects */}
                            <OperationDefectsList
                              activeTab={activeTab}
                              defects={defects}
                              isAdmin={isAdmin}
                              operationStatuses={operationStatuses}
                              isUpdatingDefects={isUpdatingDefects}
                              isLoadingDefects={false}
                              poNumber={poNumber}
                              handleDefectQuantityChange={
                                handleDefectQuantityChange
                              }
                              refreshDefectsForOperationCallback={
                                refreshDefectsForOperationCallback
                              }
                              selectedDefectId={selectedDefectId}
                              selectedDefectName={selectedDefectName}
                              setSelectedDefectId={setSelectedDefectId}
                              setSelectedDefectName={setSelectedDefectName}
                              setShowDefectItemAuditLog={
                                setShowDefectItemAuditLog
                              }
                              deleteDefect={deleteDefect}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          {
                            operationSteps.find(
                              (s) => s.code.toLowerCase() === activeTab
                            )?.name
                          }{" "}
                          details will be available after previous operations
                          are completed.
                        </div>
                      )}
                    </TabsContent>
                  ))
                ) : (
                  <TabsContent value="loading" className="p-4">
                    <div className="text-center py-8 text-gray-500">
                      Loading operation details...
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </div>

        {/* Use EndOperationModal component */}
        <EndOperationModal
          showEndOperationModal={showEndOperationModal}
          activeTab={activeTab}
          lineNo={lineNo}
          rfValue={rfValue}
          isCompletingOperation={isCompletingOperation}
          setLineNo={setLineNo}
          setShowEndOperationModal={setShowEndOperationModal}
          submitCompleteOperation={submitCompleteOperation}
        />

        {/* Audit Log Modals */}
        {isAdmin && (
          <>
            <AuditLogModal
              open={showOperationAuditLog}
              onClose={() => setShowOperationAuditLog(false)}
              poNumber={poNumber as string}
              operationId={operationStatuses[activeTab]?.operationId}
              type="operation"
              title={`Operation Audit Logs - ${activeTab?.toUpperCase()}`}
            />

            <AuditLogModal
              open={showDefectAuditLog}
              onClose={() => setShowDefectAuditLog(false)}
              poNumber={poNumber as string}
              operationId={operationStatuses[activeTab]?.operationId}
              type="defect"
              title={`Defect Audit Logs - ${activeTab?.toUpperCase()}`}
            />
          </>
        )}

        {/* Individual Defect Audit Log Modal */}
        {isAdmin && (
          <AuditLogModal
            open={showDefectItemAuditLog}
            onClose={() => setShowDefectItemAuditLog(false)}
            poNumber={poNumber as string}
            defectId={selectedDefectId ? parseInt(selectedDefectId) : undefined}
            operationId={operationStatuses[activeTab]?.operationId}
            type="defect"
            title={`Defect Audit Log - ${selectedDefectName}`}
          />
        )}
      </DashboardLayout>
    </>
  );
}

export const getServerSideProps = withServerSideAuth(async (context, auth) => {
  const { poNumber } = context.params as { poNumber: string };
  console.log("[SSP] Processing request for PO:", poNumber);

  // Simplified server-side props - only pass the PO number
  // All lock acquisition and checking happens on the client side
  return {
    props: {
      poNumberFromServer: poNumber,
    },
  };
});
