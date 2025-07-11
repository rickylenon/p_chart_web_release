"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Head from "next/head";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Pencil, Trash2, Lock, Unlock, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { withServerSideAuth } from "@/lib/auth";

interface ProductionOrder {
  poNumber: string;
  lotNumber: string;
  quantity: number;
  itemName: string;
  status: "completed" | "inProgress" | "pending";
  currentOperation: string;
  currentOperationStartTime: Date | null;
  currentOperationEndTime: Date | null;
  operations: {
    operation: string;
    startTime: Date | null;
    endTime: Date | null;
  }[];
  createdDate: Date;
  modifiedDate?: Date;
  isLocked?: boolean;
  editingUserId?: number | null;
  editingUserName?: string | null;
  lockedAt?: Date | null;
  isUserDeleted?: boolean;
}

interface ProductionOrdersProps {
  userData?: {
    id: string;
    role: string;
    name: string;
  };
}

export default function ProductionOrders({ userData }: ProductionOrdersProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { getAuthHeaders } = useAuth();
  const [currentUserId, setCurrentUserId] = useState<number | null>(
    userData ? parseInt(userData.id) : null
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrderToDelete, setSelectedOrderToDelete] =
    useState<ProductionOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Save URL parameters to localStorage
  const saveUrlToLocalStorage = (query: Record<string, string>) => {
    try {
      localStorage.setItem("productionOrdersUrl", JSON.stringify(query));
      console.log("Saved URL parameters to localStorage:", query);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  // Load URL parameters from localStorage
  const loadUrlFromLocalStorage = () => {
    try {
      const savedUrl = localStorage.getItem("productionOrdersUrl");
      if (savedUrl) {
        const query = JSON.parse(savedUrl);
        console.log("Loaded URL parameters from localStorage:", query);
        return query;
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
    return null;
  };

  // Initialize state from URL parameters or localStorage
  useEffect(() => {
    if (router.isReady && !isInitialized) {
      const {
        page: urlPage,
        limit: urlLimit,
        search,
        sortField: urlSortField,
        sortDirection: urlSortDirection,
      } = router.query;

      console.log("Initializing state from URL:", router.query);

      // If we're at the base URL and have saved parameters, use them
      if (Object.keys(router.query).length === 0) {
        const savedParams = loadUrlFromLocalStorage();
        if (savedParams && Object.keys(savedParams).length > 0) {
          console.log("Using saved parameters from localStorage");
          if (savedParams.page) setPage(Number(savedParams.page));
          if (savedParams.limit) setLimit(Number(savedParams.limit));
          if (savedParams.search) setSearchQuery(String(savedParams.search));
          if (savedParams.sortField)
            setSortField(String(savedParams.sortField));
          if (savedParams.sortDirection)
            setSortDirection(savedParams.sortDirection as "asc" | "desc");

          // Update URL with saved parameters
          router.replace(
            {
              pathname: router.pathname,
              query: savedParams,
            },
            undefined,
            { shallow: true }
          );
        } else {
          console.log(
            "No saved parameters found or localStorage empty - using defaults for new browser session"
          );
        }
      } else {
        // Otherwise use URL parameters
        if (urlPage) setPage(Number(urlPage));
        if (urlLimit) setLimit(Number(urlLimit));
        if (search) setSearchQuery(String(search));
        if (urlSortField) setSortField(String(urlSortField));
        if (urlSortDirection)
          setSortDirection(urlSortDirection as "asc" | "desc");
      }

      setIsInitialized(true);
    }
  }, [router.isReady, router.query, isInitialized]);

  // Update URL and localStorage when state changes
  useEffect(() => {
    if (router.isReady && isInitialized) {
      const query: Record<string, string> = {};

      if (page > 1) query.page = String(page);
      if (limit !== 10) query.limit = String(limit);
      if (searchQuery) query.search = searchQuery;
      if (sortField) {
        query.sortField = sortField;
        query.sortDirection = sortDirection;
      }

      console.log("Updating URL with query:", query);

      // Save to localStorage
      saveUrlToLocalStorage(query);

      // Only update URL if there are changes
      if (Object.keys(query).length > 0) {
        router.replace(
          {
            pathname: router.pathname,
            query,
          },
          undefined,
          { shallow: true }
        );
      }
    }
  }, [
    router.isReady,
    page,
    limit,
    searchQuery,
    sortField,
    sortDirection,
    isInitialized,
  ]);

  useEffect(() => {
    if (userData) {
      const role = (userData.role || "").toUpperCase();
      console.log("Setting admin status based on role:", role);
      setIsAdmin(role === "ADMIN");
    }
  }, [userData]);

  useEffect(() => {
    console.log("User data:", userData);
    console.log("User role:", userData?.role);
    console.log("isAdmin:", isAdmin);
    console.log("currentUserId:", currentUserId);
  }, [userData, isAdmin, currentUserId]);

  useEffect(() => {
    const fetchOrders = async () => {
      // Don't fetch until URL parameters are initialized
      if (!isInitialized || !userData) {
        console.log("Skipping fetch - not initialized or no user data");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const headers = getAuthHeaders();

        // Build query parameters with sorting
        let url = `/api/production-orders?page=${page}&limit=${limit}`;

        if (debouncedSearchQuery) {
          url += `&search=${encodeURIComponent(debouncedSearchQuery)}`;
        }

        if (sortField) {
          url += `&sortField=${encodeURIComponent(
            sortField
          )}&sortDirection=${sortDirection}`;
        }

        console.log("Fetching orders with URL:", url);

        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error("Failed to fetch production orders");
        }

        const data = await response.json();
        console.log("Fetched orders data:", data);

        setOrders(data.orders);
        setTotalOrders(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [
    page,
    limit,
    debouncedSearchQuery,
    userData,
    getAuthHeaders,
    toast,
    sortField,
    sortDirection,
    isAdmin,
    isInitialized,
  ]);

  const getOperationColor = (order: ProductionOrder, opCode: number) => {
    // Convert the opCode to string format (OP10, OP15, etc.)
    const opString = `OP${opCode}`;

    // Find the operation in the order's operations array
    const operation = order.operations.find((op) => op.operation === opString);

    if (!operation) {
      return "bg-gray-300"; // Not configured
    }

    if (operation.endTime) {
      return "bg-green-500"; // Completed
    }

    if (operation.startTime) {
      return "bg-blue-500"; // In progress
    }

    return "bg-gray-400"; // Not started
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrderToDelete) return;

    try {
      setIsDeleting(true);

      const response = await fetch(
        `/api/production-orders/${selectedOrderToDelete.poNumber}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete production order");
      }

      toast({
        title: "Success",
        description: `Production order ${selectedOrderToDelete.poNumber} has been deleted.`,
      });

      // Refresh the orders list
      setOrders((prev) =>
        prev.filter(
          (order) => order.poNumber !== selectedOrderToDelete.poNumber
        )
      );

      // Close the dialog
      setIsDeleteDialogOpen(false);
      setSelectedOrderToDelete(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Define columns for the DataTable
  const columns: Column<ProductionOrder>[] = [
    {
      key: "poNumber",
      header: "PO Number",
      sortable: true,
    },
    {
      key: "lotNumber",
      header: "Lot Number",
      sortable: true,
    },
    {
      key: "quantity",
      header: "Quantity",
      sortable: true,
    },
    {
      key: "itemName",
      header: "Item Name",
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (order) => (
        <span
          className={`capitalize ${
            order.status === "completed"
              ? "text-green-600"
              : order.status === "inProgress"
              ? "text-blue-600"
              : "text-gray-600"
          }`}
        >
          {order.status}
        </span>
      ),
    },
    {
      key: "currentOperation",
      header: "Current Operation",
      render: (order) => (
        <div className="flex items-center gap-1">
          {[10, 15, 20, 30, 40].map((op) => (
            <div
              key={op}
              className={`w-6 h-6 rounded-full ${getOperationColor(order, op)} 
                flex items-center justify-center text-white text-xs`}
            >
              {op}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "modifiedDate",
      header: "Modified Date",
      sortable: true,
      render: (order) =>
        format(
          new Date(order.modifiedDate || order.createdDate),
          "MMM dd, yyyy - hh:mm:ss a"
        ),
    },
    {
      key: "actions",
      header: "Actions",
      sortable: true,
      render: (order) => {
        // Check for orphaned lock (locked by a deleted user)
        const isOrphanedLock = order.editingUserId && order.isUserDeleted;

        // Debug output for action buttons
        console.log(`Rendering actions for order ${order.poNumber}:`, {
          editingUserId: order.editingUserId,
          currentUserId,
          isAdmin,
          isUserDeleted: order.isUserDeleted,
          isOrphanedLock,
        });

        return (
          <div className="flex gap-2">
            {!order.editingUserId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/production-orders/${order.poNumber}`);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}

            {order.editingUserId && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/production-orders/${order.poNumber}`);
                      }}
                    >
                      {order.editingUserId !== currentUserId && (
                        <Lock
                          className={`h-4 w-4 ${
                            isOrphanedLock ? "text-orange-500" : "text-gray-600"
                          }`}
                        />
                      )}
                      {order.editingUserId === currentUserId && (
                        <Unlock
                          className={`h-4 w-4 ${
                            isOrphanedLock
                              ? "text-orange-500"
                              : "text-green-600"
                          }`}
                        />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isOrphanedLock ? (
                      <p>
                        Locked by deleted user: {order.editingUserName} (User
                        ID: {order.editingUserId}). Click to view details.
                      </p>
                    ) : order.editingUserId === currentUserId ? (
                      <p>
                        Locked by you: {order.editingUserName} (User ID:{" "}
                        {order.editingUserId}). Click to view details.
                      </p>
                    ) : (
                      <p>
                        Locked by {order.editingUserName}. Click to view
                        details.
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOrderToDelete(order);
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Handle sort changes
  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    console.log(`Sorting by ${field} in ${direction} direction`);

    // Special logging for actions/lock status sorting
    if (field === "actions") {
      console.log(
        `Actions column sorting requested: ${
          direction === "asc" ? "Unlocked first" : "Locked first"
        }`
      );
    }

    setSortField(field);
    setSortDirection(direction);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    console.log(`Changing page to ${newPage}`);
    setPage(newPage);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newLimit: number) => {
    console.log(`Changing items per page to ${newLimit}`);
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  };

  // Handle search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`Search query changed to: ${e.target.value}`);
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page when searching
  };

  return (
    <>
      <Head>
        <title>Production Orders - P-Chart System</title>
      </Head>
      <DashboardLayout>
        <div className="py-6">
          <PageHeader
            title="Production Orders"
            description="Manage your production orders here."
            searchPlaceholder="Search PO number, lot number, or item..."
            searchValue={searchQuery}
            onSearchChange={handleSearchChange}
            actions={
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => router.push("/production-orders/create")}
              >
                Create New
              </Button>
            }
          />

          <DataTable
            data={orders}
            columns={columns}
            keyField="poNumber"
            isLoading={isLoading}
            error={error || undefined}
            pagination={{
              currentPage: page,
              totalPages: totalPages,
              totalItems: totalOrders,
              itemsPerPage: limit,
              onPageChange: handlePageChange,
              onItemsPerPageChange: handleItemsPerPageChange,
            }}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            emptyMessage="No production orders found."
          />

          {/* Delete Confirmation Dialog */}
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Production Order</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this production order? This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {selectedOrderToDelete && (
                <div className="py-4">
                  <p>
                    <strong>PO Number:</strong> {selectedOrderToDelete.poNumber}
                  </p>
                  <p>
                    <strong>Lot Number:</strong>{" "}
                    {selectedOrderToDelete.lotNumber}
                  </p>
                  <p>
                    <strong>Item Name:</strong> {selectedOrderToDelete.itemName}
                  </p>
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteOrder}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Deleting...
                    </div>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DashboardLayout>
    </>
  );
}

// Add server-side authentication
export const getServerSideProps = withServerSideAuth(async (context, auth) => {
  console.log(
    "[Production Orders] Server-side auth with user:",
    auth.user?.name
  );

  return {
    props: {
      // Pass user data from server authentication to component props
      userData: auth.user || null,
    },
  };
});
