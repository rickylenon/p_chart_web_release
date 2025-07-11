import { useEffect, useState } from "react";
import { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { withAuth } from "@/lib/clientAuth";
import api from "@/lib/axios";
import dateFormat from "dateformat";
import toast from "react-hot-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/layout/PageHeader";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column } from "@/components/shared/DataTable";
import { useNotification } from "@/contexts/NotificationContext";

// Interface for the operation defect edit request
interface OperationDefectEditRequest {
  id: number;
  operationDefectId: number;
  operationId: number;
  productionOrderId: number;
  requestedById: number;
  currentQty: number;
  requestedQty: number;
  currentRw?: number;
  requestedRw?: number;
  currentNg?: number;
  requestedNg?: number;
  currentReplacement?: number;
  requestedReplacement?: number;
  operationCode?: string; // To identify OP10 operations
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestType?: "add" | "edit" | "delete";
  createdAt: string;
  resolvedAt?: string;
  resolvedById?: number;
  resolutionNote?: string;
  isLocked?: boolean;
  editingUserId?: number | null;
  editingUserName?: string | null;
  lockedAt?: Date | null;
  operationDefect?: {
    id: number;
    defectId: number;
    defectName: string;
    defectReworkable: boolean;
  };
  operation?: {
    id: number;
    operation: string;
  };
  productionOrder?: {
    id: number;
    poNumber: string;
    partNumber: string;
    partName: string;
  };
  requestedBy?: {
    id: number;
    name: string;
    email: string;
  };
  resolvedBy?: {
    id: number;
    name: string;
    email: string;
  };
}

// Interface for user data
interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
}

const OperationDefectsEditRequestsPage: NextPage = () => {
  const router = useRouter();
  const [operationDefectsEditRequests, setOperationDefectsEditRequests] =
    useState<OperationDefectEditRequest[]>([]);
  const [
    filteredOperationDefectsEditRequests,
    setFilteredOperationDefectsEditRequests,
  ] = useState<OperationDefectEditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEncoder, setIsEncoder] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  // Edit request dialog states
  const [
    selectedOperationDefectEditRequest,
    setSelectedOperationDefectEditRequest,
  ] = useState<OperationDefectEditRequest | null>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolveStatus, setResolveStatus] = useState<"approved" | "rejected">(
    "approved"
  );
  const [resolveNote, setResolveNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add the notification context
  const { emit, isConnected } = useNotification();

  // Get current user on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        console.log("Fetching current user info");
        const response = await api.get("/api/me");

        if (response.data) {
          const userData = response.data as UserData;
          setCurrentUser(userData);
          const userRole = userData.role.toLowerCase();
          setIsAdmin(userRole === "admin");
          setIsEncoder(userRole === "encoder");
          console.log(
            "Current user:",
            userData,
            "isAdmin:",
            userRole === "admin",
            "isEncoder:",
            userRole === "encoder"
          );
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Handle URL hash to directly open a specific request
  useEffect(() => {
    // Check if there's a hash in the URL and if we have requests loaded
    if (
      router.asPath.includes("#") &&
      operationDefectsEditRequests.length > 0 &&
      !isLoading
    ) {
      const requestId = parseInt(router.asPath.split("#")[1]);
      console.log(`Found request ID in URL hash: ${requestId}`);

      if (!isNaN(requestId)) {
        // Find the request with the matching ID
        const foundRequest = operationDefectsEditRequests.find(
          (req) => req.id === requestId
        );

        if (foundRequest) {
          console.log(
            `Found matching request for ID ${requestId}:`,
            foundRequest
          );
          handleViewOperationDefectEditRequest(foundRequest);
        } else {
          console.log(
            `Request with ID ${requestId} not found in loaded requests`
          );
          // If not found in loaded requests (possibly due to filtering), fetch it directly
          fetchSingleRequest(requestId);
        }
      }
    }
  }, [router.asPath, operationDefectsEditRequests, isLoading]);

  // Function to fetch a single request by ID
  const fetchSingleRequest = async (requestId: number) => {
    try {
      console.log(`Fetching single request with ID: ${requestId}`);

      // Use the main endpoint with a query parameter instead of a path parameter
      const response = await api.get(`/api/operation-defect-edit-requests`, {
        params: { id: requestId },
      });

      if (response.data) {
        // Check if we have any edit requests in the response
        const responseData = response.data as {
          editRequests?: OperationDefectEditRequest[];
        };

        if (responseData.editRequests && responseData.editRequests.length > 0) {
          // Find the specific request in the returned array
          const foundRequest = responseData.editRequests.find(
            (req) => req.id === requestId
          );

          if (foundRequest) {
            console.log(
              `Successfully fetched request with ID ${requestId}:`,
              foundRequest
            );
            handleViewOperationDefectEditRequest(foundRequest);
          } else {
            console.log(`Request with ID ${requestId} not found in response`);
            toast.error("Edit request not found");
          }
        } else {
          console.log(`No edit requests found in API response`);
          toast.error("Edit request not found");
        }
      }
    } catch (error) {
      console.error(
        `Error fetching operation defect edit request with ID ${requestId}:`,
        error
      );
      toast.error("Failed to load the requested edit request");
    }
  };

  // Fetch edit requests from API for admins and encoders
  useEffect(() => {
    if (!isAdmin && !isEncoder) return;

    const fetchOperationDefectsEditRequests = async () => {
      try {
        console.log("Fetching operation defects edit requests");
        setIsLoading(true);

        // Build query parameters with sorting
        let url = "/api/operation-defect-edit-requests";

        // Add query parameters
        const params = new URLSearchParams();

        // Only add status param if not "all"
        if (statusFilter !== "all") {
          params.append("status", statusFilter);
        }

        if (sortField) {
          params.append("sortField", sortField);
          params.append("sortDirection", sortDirection);
        }

        // Append query string if any parameters exist
        if ([...params].length > 0) {
          url += `?${params.toString()}`;
        }

        console.log(`Calling API with URL: ${url}`);
        console.log(`Status filter: ${statusFilter}`);

        const response = await api.get(url);
        const data = response.data as {
          editRequests: OperationDefectEditRequest[];
        };
        console.log(
          `Received ${
            data.editRequests?.length || 0
          } edit requests with status filter: ${statusFilter}`
        );

        // Force explicit empty array if no results to ensure state updates
        const receivedRequests = data.editRequests || [];
        setOperationDefectsEditRequests(receivedRequests);

        // Also immediately update the filtered requests to match
        setFilteredOperationDefectsEditRequests(receivedRequests);
        console.log(`Updated state with ${receivedRequests.length} requests`);
      } catch (error) {
        console.error("Error fetching operation defects edit requests:", error);
        toast.error("Failed to load operation defects edit requests");
        // Clear state on error
        setOperationDefectsEditRequests([]);
        setFilteredOperationDefectsEditRequests([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOperationDefectsEditRequests();
  }, [isAdmin, isEncoder, sortField, sortDirection, statusFilter]);

  // Filter requests based on search query
  useEffect(() => {
    if (!operationDefectsEditRequests) {
      setFilteredOperationDefectsEditRequests([]);
      return;
    }

    console.log(
      `Filtering ${operationDefectsEditRequests.length} requests by search: "${searchQuery}"`
    );
    let filtered = operationDefectsEditRequests;

    // Apply search filter if there's a search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (request) =>
          (request.productionOrder?.poNumber || "")
            .toLowerCase()
            .includes(query) ||
          (request.operationDefect?.defectName || "")
            .toLowerCase()
            .includes(query) ||
          (request.operation?.operation || "").toLowerCase().includes(query) ||
          (request.requestedBy?.name || "").toLowerCase().includes(query)
      );
    }

    console.log(`Filtered to ${filtered.length} requests after search`);
    setFilteredOperationDefectsEditRequests(filtered);
  }, [operationDefectsEditRequests, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleViewOperationDefectEditRequest = (
    request: OperationDefectEditRequest
  ) => {
    console.log("Viewing operation defect edit request:", request);
    setSelectedOperationDefectEditRequest(request);
    setIsResolveDialogOpen(true);
    setResolveStatus("approved");
    setResolveNote("");
  };

  const handleResolveOperationDefectEditRequest = async () => {
    if (!selectedOperationDefectEditRequest) return;

    setIsSubmitting(true);

    try {
      console.log(
        `Resolving operation defect edit request ${selectedOperationDefectEditRequest.id} with status: ${resolveStatus}`
      );
      // Define the expected response type
      interface ResolveResponse {
        message: string;
        editRequest: OperationDefectEditRequest;
      }

      const response = await api.put<ResolveResponse>(
        `/api/operation-defect-edit-requests/${selectedOperationDefectEditRequest.id}/resolve`,
        {
          status: resolveStatus,
          comments: resolveNote,
        }
      );

      console.log("Response:", response.data);

      // Get updated request from API response
      const updatedRequest = response.data.editRequest;

      // Update the request in the list
      setOperationDefectsEditRequests((prev) =>
        prev.map((req) =>
          req.id === selectedOperationDefectEditRequest.id
            ? updatedRequest
            : req
        )
      );

      // If connected, emit WebSocket event for real-time updates
      if (isConnected) {
        console.log(
          "Emitting defect-edit-resolved event for real-time updates"
        );

        // Emit the event with request data
        emit("defect-edit-resolved", {
          id: updatedRequest.id,
          defectId: updatedRequest.operationDefectId,
          requestedById: updatedRequest.requestedById,
          resolvedById: updatedRequest.resolvedById,
          approved: resolveStatus === "approved",
          createdAt: new Date().toISOString(),
        });

        // Also broadcast to update notification counts for all clients
        emit("update-notification-count", {});
      } else {
        console.warn(
          "Socket not connected, only server-side notification will be used"
        );
      }

      setIsResolveDialogOpen(false);
      setSelectedOperationDefectEditRequest(null);
      setResolveNote("");

      toast.success(
        `Operation defect edit request ${
          resolveStatus === "approved" ? "approved" : "rejected"
        } successfully`
      );
    } catch (error) {
      console.error("Error resolving operation defect edit request:", error);
      toast.error("Failed to resolve operation defect edit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    console.log(`Sorting by ${field} ${direction}`);
    setSortField(field);
    setSortDirection(direction);
  };

  const handlePageChange = (page: number) => {
    console.log(`Changing to page ${page}`);
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (perPage: number) => {
    console.log(`Changing items per page to ${perPage}`);
    setItemsPerPage(perPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleStatusFilterChange = (value: string) => {
    console.log(`Changing status filter to: ${value}`);
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page when changing filter
  };

  // Determine the status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Define columns for the DataTable
  const columns: Column<OperationDefectEditRequest>[] = [
    {
      key: "productionOrder.poNumber",
      header: "PO Number",
      sortable: true,
      render: (item) => (
        <a
          href={`/production-orders/${item.productionOrder?.poNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer text-blue-600 hover:underline font-medium"
        >
          {item.productionOrder?.poNumber}
        </a>
      ),
    },
    {
      key: "operation.operation",
      header: "Operation",
      sortable: true,
      render: (item) => item.operation?.operation,
    },
    {
      key: "requestType",
      header: "Request Type",
      sortable: true,
      render: (item) => {
        const type = item.requestType || "edit";
        switch (type) {
          case "add":
            return (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                Add
              </Badge>
            );
          case "delete":
            return (
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200"
              >
                Delete
              </Badge>
            );
          default:
            return (
              <Badge
                variant="outline"
                className="bg-gray-50 text-gray-700 border-gray-200"
              >
                Edit
              </Badge>
            );
        }
      },
    },
    {
      key: "operationDefect.defectName",
      header: "Defect",
      sortable: true,
      render: (item) => item.operationDefect?.defectName,
    },
    {
      key: "operationDefectId",
      header: "Operation Defect ID",
      sortable: true,
      render: (item) => item.operationDefectId,
    },
    {
      key: "requestedBy.name",
      header: "Requested By",
      sortable: true,
      render: (item) => item.requestedBy?.name,
    },
    {
      key: "createdAt",
      header: "Date Requested",
      sortable: true,
      render: (item) =>
        dateFormat(new Date(item.createdAt), "mmm d, yyyy h:MM TT"),
    },
    {
      key: "requestedQty",
      header: "Req. Change",
      sortable: true,
      render: (item) => {
        const qtyDiff = item.requestedQty - item.currentQty;
        const qtyColor =
          qtyDiff > 0 ? "text-green-600" : qtyDiff < 0 ? "text-red-600" : "";

        // Basic quantity info for all request types
        const qtyInfo = (
          <span className={qtyColor}>
            {item.currentQty} → {item.requestedQty} (
            {qtyDiff > 0 ? `+${qtyDiff}` : qtyDiff})
          </span>
        );

        // Add RP info for OP10 operations
        if (
          item.operationCode?.toLowerCase() === "op10" &&
          item.requestType !== "delete"
        ) {
          const currentRp =
            item.currentReplacement !== undefined
              ? item.currentReplacement
              : item.currentQty;
          const requestedRp =
            item.requestedReplacement !== undefined
              ? item.requestedReplacement
              : item.requestedQty;
          const rpDiff = requestedRp - currentRp;
          const rpColor =
            rpDiff > 0 ? "text-blue-600" : rpDiff < 0 ? "text-blue-600" : "";

          return (
            <div>
              {qtyInfo}
              <div className={`text-sm ${rpColor}`}>
                RP: {currentRp} → {requestedRp} (
                {rpDiff > 0 ? `+${rpDiff}` : rpDiff})
              </div>
            </div>
          );
        }

        return qtyInfo;
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => getStatusBadge(item.status),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewOperationDefectEditRequest(item)}
          disabled={isAdmin ? item.status !== "pending" : false}
        >
          {isEncoder || item.status !== "pending" ? "View" : "Review"}
        </Button>
      ),
    },
  ];

  // Calculate pagination
  const paginatedRequests = filteredOperationDefectsEditRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(
    filteredOperationDefectsEditRequests.length / itemsPerPage
  );

  return (
    <DashboardLayout>
      <Head>
        <title>Operation Defects Edit Requests | P-Chart</title>
      </Head>
      <div className="py-6">
        <PageHeader
          title="Operation Defects Edit Requests"
          description="View and manage operation defects edit requests"
          searchPlaceholder="Search requests..."
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          actions={
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        <Card className="mt-6">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <DataTable
                data={filteredOperationDefectsEditRequests}
                columns={columns}
                keyField="id"
                isLoading={isLoading}
                error=""
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                pagination={{
                  currentPage: currentPage,
                  totalPages: totalPages,
                  totalItems: filteredOperationDefectsEditRequests.length,
                  itemsPerPage: itemsPerPage,
                  onPageChange: handlePageChange,
                  onItemsPerPageChange: handleItemsPerPageChange,
                }}
                emptyMessage="No operation defects edit requests found."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Request Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEncoder ? "View" : "Review"} Operation Defect Edit Request
            </DialogTitle>
            <DialogDescription>
              {isEncoder
                ? "View details of the operation defect edit request"
                : "Review and approve or reject the operation defect edit request"}
            </DialogDescription>
          </DialogHeader>

          {selectedOperationDefectEditRequest && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    PO Number
                  </Label>
                  <p className="font-medium">
                    {
                      selectedOperationDefectEditRequest.productionOrder
                        ?.poNumber
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Part</Label>
                  <p>
                    {
                      selectedOperationDefectEditRequest.productionOrder
                        ?.partName
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Operation
                  </Label>
                  <p>
                    {selectedOperationDefectEditRequest.operation?.operation}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Defect
                  </Label>
                  <p>
                    {
                      selectedOperationDefectEditRequest.operationDefect
                        ?.defectName
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Request Type
                  </Label>
                  <p className="mt-1">
                    {(() => {
                      const type =
                        selectedOperationDefectEditRequest.requestType ||
                        "edit";
                      switch (type) {
                        case "add":
                          return (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              Add
                            </Badge>
                          );
                        case "delete":
                          return (
                            <Badge
                              variant="outline"
                              className="bg-red-50 text-red-700 border-red-200"
                            >
                              Delete
                            </Badge>
                          );
                        default:
                          return (
                            <Badge
                              variant="outline"
                              className="bg-gray-50 text-gray-700 border-gray-200"
                            >
                              Edit
                            </Badge>
                          );
                      }
                    })()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedOperationDefectEditRequest.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Operation Defect ID
                  </Label>
                  <p>{selectedOperationDefectEditRequest.operationDefectId}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Requested By
                  </Label>
                  <p>{selectedOperationDefectEditRequest.requestedBy?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Current Quantity
                  </Label>
                  <p className="font-medium">
                    {selectedOperationDefectEditRequest.currentQty}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Requested Quantity
                  </Label>
                  <p className="font-medium">
                    {selectedOperationDefectEditRequest.requestedQty}
                  </p>
                </div>
              </div>

              {(selectedOperationDefectEditRequest.currentRw !== undefined ||
                selectedOperationDefectEditRequest.requestedRw !==
                  undefined) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Current RW/NG
                    </Label>
                    <p>
                      RW: {selectedOperationDefectEditRequest.currentRw ?? 0},
                      NG: {selectedOperationDefectEditRequest.currentNg ?? 0}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Requested RW/NG
                    </Label>
                    <p>
                      RW: {selectedOperationDefectEditRequest.requestedRw ?? 0},
                      NG: {selectedOperationDefectEditRequest.requestedNg ?? 0}
                    </p>
                  </div>
                </div>
              )}

              {/* Display Replacement values for OP10 operations */}
              {selectedOperationDefectEditRequest.operationCode?.toLowerCase() ===
                "op10" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Current Replacement (RP)
                    </Label>
                    <p className="text-blue-600 dark:text-blue-400 font-medium">
                      {selectedOperationDefectEditRequest.currentReplacement ??
                        selectedOperationDefectEditRequest.currentQty ??
                        0}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Requested Replacement (RP)
                    </Label>
                    <p className="text-blue-600 dark:text-blue-400 font-medium">
                      {selectedOperationDefectEditRequest.requestedReplacement ??
                        selectedOperationDefectEditRequest.requestedQty ??
                        0}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">
                  Reason for Edit
                </Label>
                <p className="text-sm mt-1 p-2 bg-muted rounded-md">
                  {selectedOperationDefectEditRequest.reason}
                </p>
              </div>

              {/* Timestamps information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Date Requested
                  </Label>
                  <p>
                    {dateFormat(
                      new Date(selectedOperationDefectEditRequest.createdAt),
                      "mmm d, yyyy h:MM TT"
                    )}
                  </p>
                </div>
                {selectedOperationDefectEditRequest.resolvedAt && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Date Resolved
                    </Label>
                    <p>
                      {dateFormat(
                        new Date(selectedOperationDefectEditRequest.resolvedAt),
                        "mmm d, yyyy h:MM TT"
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Resolution information if already resolved */}
              {selectedOperationDefectEditRequest.status !== "pending" && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Resolved By
                    </Label>
                    <p>
                      {selectedOperationDefectEditRequest.resolvedBy?.name ||
                        "N/A"}
                    </p>
                  </div>

                  {selectedOperationDefectEditRequest.resolutionNote && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Resolution Notes
                      </Label>
                      <p className="text-sm mt-1 p-2 bg-muted rounded-md">
                        {selectedOperationDefectEditRequest.resolutionNote}
                      </p>
                    </div>
                  )}
                </>
              )}

              {!isEncoder &&
                selectedOperationDefectEditRequest.status === "pending" && (
                  <>
                    <div>
                      <Label htmlFor="resolution-type">Resolution</Label>
                      <Select
                        value={resolveStatus}
                        onValueChange={(value) =>
                          setResolveStatus(value as "approved" | "rejected")
                        }
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="resolution-type">
                          <SelectValue placeholder="Select resolution" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved">Approve</SelectItem>
                          <SelectItem value="rejected">Reject</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any notes about your decision"
                        value={resolveNote}
                        onChange={(e) => setResolveNote(e.target.value)}
                        disabled={isSubmitting}
                        className="h-20"
                      />
                    </div>
                  </>
                )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResolveDialogOpen(false)}
              disabled={isSubmitting}
            >
              {isEncoder ? "Close" : "Cancel"}
            </Button>
            {!isEncoder && (
              <Button
                onClick={handleResolveOperationDefectEditRequest}
                disabled={isSubmitting}
                variant={
                  resolveStatus === "approved" ? "default" : "destructive"
                }
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : resolveStatus === "approved" ? (
                  "Approve Request"
                ) : (
                  "Reject Request"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default withAuth(OperationDefectsEditRequestsPage);
