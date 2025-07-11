"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/layout/PageHeader";
import { Lock } from "lucide-react";

export default function CreateProductionOrder() {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthorized, isLoading: authLoading, getAuthHeaders } = useAuth();
  const { initialPoNumber } = router.query;
  const { data: session } = useSession();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingDb, setIsCheckingDb] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    poNumber: typeof initialPoNumber === "string" ? initialPoNumber : "",
    lotNumber: "",
    quantity: "",
    itemName: "",
  });

  // Check if database has required data
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        console.log("Checking if database is properly seeded");
        // Check operation steps
        const opStepsResponse = await fetch("/api/operation-steps", {
          headers: getAuthHeaders(),
        });

        if (!opStepsResponse.ok) {
          throw new Error("Failed to fetch operation steps");
        }

        const operationSteps = await opStepsResponse.json();

        if (!operationSteps || operationSteps.length === 0) {
          setDbError(
            "No operation steps found in database. Please run database seeding."
          );
          return;
        }

        console.log(`Found ${operationSteps.length} operation steps`);
        setDbError(null);
      } catch (error) {
        console.error("Error checking database:", error);
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        setDbError(`Database setup issue: ${errorMessage}`);
      } finally {
        setIsCheckingDb(false);
      }
    };

    checkDatabase();
  }, [getAuthHeaders]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Add this function to prevent form submission on Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent form submission when Enter key is pressed (common with scanners)
    if (e.key === "Enter") {
      e.preventDefault();
      console.log("Enter key detected, preventing automatic submission");

      // Move focus to the next field if appropriate
      const nextInput = e.currentTarget.form?.querySelector(
        `input[name="${getNextFieldName(e.currentTarget.name)}"]`
      );
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    }
  };

  // Helper to determine the next field in the form
  const getNextFieldName = (currentField: string) => {
    const fieldOrder = ["poNumber", "lotNumber", "quantity", "itemName"];
    const currentIndex = fieldOrder.indexOf(currentField);
    return currentIndex < fieldOrder.length - 1
      ? fieldOrder[currentIndex + 1]
      : "poNumber";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.poNumber) {
      toast({
        title: "Error",
        description: "Production Order Number is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.quantity) {
      toast({
        title: "Error",
        description: "Quantity is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Submitting production order:", formData);

      const response = await fetch("/api/production-orders/create", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poNumber: formData.poNumber,
          lotNumber: formData.lotNumber,
          poQuantity: formData.quantity,
          itemName: formData.itemName,
        }),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        throw new Error(errorData.error || "Failed to create production order");
      }

      const data = await response.json();
      console.log("Created production order:", data);

      toast({
        title: "Success",
        description: "Production order created successfully!",
      });

      // Redirect to the production order details page with a query param to show success message
      router.push({
        pathname: `/production-orders/${formData.poNumber}`,
        query: { newOrder: "true" },
      });
    } catch (error) {
      console.error("Error creating production order:", error);
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
  };

  if (authLoading || isCheckingDb) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Create Production Order - P-Chart System</title>
      </Head>
      {session?.user?.role?.toLowerCase() !== "viewer" && (
        <DashboardLayout>
          <div className="mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-purple-700">
                Create New Production Order
              </h1>
              <div className="flex items-center space-x-2">
                {session?.user?.role?.toLowerCase() === "viewer" && (
                  <div className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-md">
                    Viewer Mode
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => router.push("/production-orders")}
                >
                  Back to List
                </Button>
              </div>
            </div>

            {dbError && (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Database Error</AlertTitle>
                <AlertDescription>{dbError}</AlertDescription>
              </Alert>
            )}

            <div className="bg-white rounded-lg shadow p-6">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      PO Number*
                    </label>
                    <Input
                      name="poNumber"
                      value={formData.poNumber}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Lot Number
                    </label>
                    <Input
                      name="lotNumber"
                      value={formData.lotNumber}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Quantity*
                    </label>
                    <Input
                      name="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Item Name
                    </label>
                    <Input
                      name="itemName"
                      value={formData.itemName}
                      onChange={handleChange}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                </div>

                <div className="mt-6 text-right">
                  <Button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={isSubmitting || !isAuthorized}
                  >
                    {isSubmitting ? "Creating..." : "Create Production Order"}
                  </Button>
                </div>
              </form>
            </div>

            <div className="mt-6 bg-gray-50 p-4 rounded-lg hidden">
              <h2 className="text-lg font-medium mb-2">Debug Information</h2>
              <p className="text-xs text-gray-600">
                For troubleshooting purposes only
              </p>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-60">
                {JSON.stringify(
                  {
                    formData,
                    isSubmitting,
                    dbError,
                    authStatus: isAuthorized ? "Authorized" : "Unauthorized",
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </DashboardLayout>
      )}
      {session?.user?.role?.toLowerCase() === "viewer" && (
        <DashboardLayout>
          <div className="py-6">
            <PageHeader
              title={`Create New Production Order`}
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
                      Viewers are not authorized to create production orders.
                    </h3>
                    <p className="text-amber-700 mt-1">
                      Please contact your administrator to create a production
                      order.
                    </p>
                    <div className="mt-3 flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => router.push("/production-orders")}
                      >
                        Return to List
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DashboardLayout>
      )}
    </>
  );
}
