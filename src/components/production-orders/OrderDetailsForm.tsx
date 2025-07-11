import { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FormData {
  lotNumber: string;
  quantity: string;
  itemName: string;
}

interface OrderDetailsFormProps {
  poNumber: string | string[] | undefined;
  formData: FormData;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleUpdate: () => void;
  isSubmitting: boolean;
  isAdmin: boolean;
  session: any;
  orderData: any;
}

export function OrderDetailsForm({
  poNumber,
  formData,
  handleChange,
  handleUpdate,
  isSubmitting,
  isAdmin,
  session,
  orderData
}: OrderDetailsFormProps) {
  console.log(`Rendering OrderDetailsForm for PO: ${poNumber}`);
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-6">
      <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
        <div className="w-full md:w-1/6">
          <label className="block text-xs font-medium text-gray-600">PO Number</label>
          <Input
            value={poNumber as string}
            disabled
            className="bg-gray-50 dark:bg-gray-900 dark:text-white h-8 text-sm"
          />
        </div>
        
        <div className="w-full md:w-1/6">
          <label className="block text-xs font-medium text-gray-600">Lot Number</label>
          <Input
            name="lotNumber"
            value={formData.lotNumber}
            onChange={handleChange}
            disabled={!isAdmin}
            className={`h-8 text-sm ${!isAdmin ? "bg-gray-50" : ""}`}
          />
        </div>
        
        <div className="w-full md:w-1/6">
          <label className="block text-xs font-medium text-gray-600">Status</label>
          <Input
            value={orderData?.status || 'CREATED'}
            disabled
            className="bg-gray-50 h-8 text-sm"
          />
        </div>
        
        <div className="w-full md:w-1/6">
          <label className="block text-xs font-medium text-gray-600">Quantity</label>
          <Input
            name="quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={handleChange}
            disabled={!isAdmin}
            className={`h-8 text-sm ${!isAdmin ? "bg-gray-50" : ""}`}
          />
        </div>
        
        <div className="w-full md:w-1/6">
          <label className="block text-xs font-medium text-gray-600">Item Name</label>
          <Input
            name="itemName"
            value={formData.itemName}
            onChange={handleChange}
            disabled={!isAdmin}
            className={`h-8 text-sm ${!isAdmin ? "bg-gray-50" : ""}`}
          />
        </div>
        
        <div className="w-full md:w-1/6">
          <label className="block text-xs font-medium text-gray-600 invisible">Action</label>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white h-8 w-full"
            onClick={handleUpdate}
            disabled={isSubmitting || !session || !session.user || !isAdmin}
          >
            {isSubmitting ? 'Saving...' : (!isAdmin ? 'View Only' : 'Save')}
          </Button>
        </div>
      </div>
    </div>
  );
} 