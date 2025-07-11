import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { DefectAddRequestDialog } from "@/components/operation-defects/DefectAddRequestDialog";
import { useSession } from "next-auth/react";

interface MasterDefect {
  id: string;
  name: string;
  category: string;
  reworkable: boolean;
  machine?: string;
}

interface OperationDefect {
  id: string;
  defectId?: string | number;
  operationId: number;
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

interface SearchMasterDefectsListProps {
  activeTab: string;
  masterDefects: MasterDefect[];
  isAdmin: boolean;
  operationStatuses: Record<string, OperationStatus>;
  isLoading: boolean;
  handleAddDefect: (defectId: string) => void;
  existingDefects?: OperationDefect[];
  poNumber: string | string[] | undefined;
  refreshDefectsForOperationCallback?: () => void;
}

export function SearchMasterDefectsList({
  activeTab,
  masterDefects,
  isAdmin,
  operationStatuses,
  isLoading,
  handleAddDefect,
  existingDefects = [],
  poNumber,
  refreshDefectsForOperationCallback
}: SearchMasterDefectsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDefect, setSelectedDefect] = useState<MasterDefect | null>(null);
  const [showAddRequestDialog, setShowAddRequestDialog] = useState(false);
  const { data: session } = useSession();
  
  console.log(`Rendering SearchMasterDefectsList for tab: ${activeTab}, defects count: ${masterDefects.length}, existing defects: ${existingDefects.length}`);
  console.log('User role:', session?.user?.role);
  
  const currentOperationId = operationStatuses[activeTab]?.operationId;
  const isOperationCompleted = operationStatuses[activeTab]?.isCompleted;
  const isOperationStarted = operationStatuses[activeTab]?.isStarted;
  
  const existingDefectIds = existingDefects
    .filter(d => d.operationId === currentOperationId)
    .map(d => String(d.defectId));
  
  console.log(`Operation ID: ${currentOperationId}, Existing defect IDs: ${existingDefectIds.join(', ')}`);
  console.log(`Operation completed: ${isOperationCompleted}, Operation started: ${isOperationStarted}, Is admin: ${isAdmin}`);
  
  const handleDefectSelect = (defect: MasterDefect) => {
    console.log(`Selected defect from search: ${defect.name}`);
    
    // If non-admin and operation is completed, show request dialog instead of adding directly
    if (!isAdmin && isOperationCompleted) {
      setSelectedDefect(defect);
      setShowAddRequestDialog(true);
      setSearchQuery('');
    } else {
      // Otherwise proceed with direct add as before
      handleAddDefect(defect.id);
      setSearchQuery('');
    }
  };
  
  const handleAddRequestDialogClose = () => {
    setShowAddRequestDialog(false);
    setSelectedDefect(null);
    
    // Refresh the defects list if needed
    if (refreshDefectsForOperationCallback) {
      refreshDefectsForOperationCallback();
    }
  };
  
  return (
    <div className="mb-1">
      {/* Defect add request dialog */}
      {selectedDefect && (
        <DefectAddRequestDialog
          open={showAddRequestDialog}
          onClose={handleAddRequestDialogClose}
          defect={selectedDefect}
          operationId={currentOperationId}
          operationCode={activeTab}
          poNumber={typeof poNumber === 'string' ? poNumber : Array.isArray(poNumber) ? poNumber[0] : ''}
        />
      )}
      
      <div className="relative w-full">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
        <Input
          type="search"
          placeholder={isOperationStarted ? "Search master defects..." : "Start operation to search master defects"}
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={!isOperationStarted || session?.user?.role?.toLowerCase() === 'viewer'}
        />
        {searchQuery && (
          <div className="absolute z-10 w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-md shadow-lg mt-1 max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : (
              <>
                {masterDefects
                  .filter(defect => 
                    (defect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    defect.category.toLowerCase().includes(searchQuery.toLowerCase())) &&
                    !existingDefectIds.includes(String(defect.id))
                  )
                  .map(defect => (
                    <div 
                      key={defect.id} 
                      className="p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                      onClick={() => handleDefectSelect(defect)}
                    >
                      <div className="font-medium dark:text-white">[{defect.id}] {defect.name}</div>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{defect.category}</span>
                        {defect.machine && <span>Machine: {defect.machine}</span>}
                      </div>
                      {defect.reworkable && (
                        <div className="text-xs text-green-500 dark:text-green-400 mt-1">Reworkable</div>
                      )}
                      {!isAdmin && isOperationCompleted && (
                        <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">+ Request to add</div>
                      )}
                    </div>
                  ))}
                {masterDefects.filter(defect => 
                  (defect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  defect.category.toLowerCase().includes(searchQuery.toLowerCase())) &&
                  !existingDefectIds.includes(String(defect.id))
                ).length === 0 && (
                  <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                    No defects found matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 