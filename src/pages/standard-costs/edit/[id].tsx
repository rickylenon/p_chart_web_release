import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Head from "next/head";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withAdminAuth } from "@/lib/clientAuth";
import { toast } from "react-hot-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface StandardCostForm {
  itemName: string;
  description: string;
  costPerUnit: string;
  currency: string;
}

interface StandardCost {
  id: number;
  itemName: string;
  description: string | null;
  costPerUnit: number;
  currency: string;
  isActive: boolean;
}

function EditStandardCost() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const [standardCost, setStandardCost] = useState<StandardCost | null>(null);
  const [formData, setFormData] = useState<StandardCostForm>({
    itemName: "",
    description: "",
    costPerUnit: "",
    currency: "USD",
  });
  const [errors, setErrors] = useState<Partial<StandardCostForm>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch standard cost data
  useEffect(() => {
    const fetchStandardCost = async () => {
      if (!id || Array.isArray(id)) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/standard-costs/${id}`, {
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 404) {
            toast.error("Standard cost not found");
            router.push("/standard-costs");
            return;
          }
          throw new Error("Failed to fetch standard cost");
        }

        const data: StandardCost = await response.json();
        setStandardCost(data);
        setFormData({
          itemName: data.itemName,
          description: data.description || "",
          costPerUnit: data.costPerUnit.toString(),
          currency: data.currency,
        });
      } catch (error) {
        console.error("Error fetching standard cost:", error);
        toast.error("Failed to load standard cost");
        router.push("/standard-costs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStandardCost();
  }, [id, router]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof StandardCostForm]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<StandardCostForm> = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = "Item name is required";
    }

    if (!formData.costPerUnit.trim()) {
      newErrors.costPerUnit = "Cost per unit is required";
    } else {
      const cost = parseFloat(formData.costPerUnit);
      if (isNaN(cost) || cost < 0) {
        newErrors.costPerUnit = "Cost per unit must be a valid positive number";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !standardCost) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/standard-costs/${standardCost.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          itemName: formData.itemName.trim(),
          description: formData.description.trim() || null,
          costPerUnit: parseFloat(formData.costPerUnit),
          currency: formData.currency,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update standard cost");
      }

      const updatedStandardCost = await response.json();
      console.log("Updated standard cost:", updatedStandardCost);

      toast.success("Standard cost updated successfully");
      router.push("/standard-costs");
    } catch (error) {
      console.error("Error updating standard cost:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update standard cost"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/standard-costs");
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Edit Standard Cost - P-Chart System</title>
        </Head>
        <DashboardLayout>
          <div className="py-6">
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading standard cost...</span>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  if (!standardCost) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Edit Standard Cost - P-Chart System</title>
      </Head>
      <DashboardLayout>
        <div className="py-6">
          <PageHeader
            title="Edit Standard Cost"
            description={`Update standard cost information for ${standardCost.itemName}`}
            actions={
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>Standard Cost Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="itemName">
                      Item Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="itemName"
                      name="itemName"
                      type="text"
                      value={formData.itemName}
                      onChange={handleInputChange}
                      placeholder="Enter item name"
                      className={errors.itemName ? "border-red-500" : ""}
                    />
                    {errors.itemName && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.itemName}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="costPerUnit">
                      Cost Per Unit <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="costPerUnit"
                      name="costPerUnit"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.costPerUnit}
                      onChange={handleInputChange}
                      placeholder="0.0000"
                      className={errors.costPerUnit ? "border-red-500" : ""}
                    />
                    {errors.costPerUnit && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.costPerUnit}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="JPY">JPY</option>
                    </select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <div className="mt-2 flex items-center space-x-2">
                      {standardCost.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter optional description"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Standard Cost
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </>
  );
}

export default withAdminAuth(EditStandardCost);
