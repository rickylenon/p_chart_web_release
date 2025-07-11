import { TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface OperationTabsProps {
  operationSteps: OperationStep[];
  activeTab: string;
  operationStatuses: Record<string, OperationStatus>;
  isAdmin: boolean;
  handleTabChange: (value: string) => void;
}

export function OperationTabs({
  operationSteps,
  activeTab,
  operationStatuses,
  isAdmin,
  handleTabChange
}: OperationTabsProps) {
  console.log(`Rendering OperationTabs with ${operationSteps.length} steps, activeTab: ${activeTab}`);
  
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      <div 
        className="grid w-full gap-1"
        style={{ 
          gridTemplateColumns: `repeat(${operationSteps.length || 5}, 1fr)` 
        }}
      >
        {operationSteps.length > 0 ? (
          operationSteps.map((step, index) => {
            const opCode = step.code.toLowerCase();
            const status = operationStatuses[opCode];
            const isDisabled = 
              index > 0 && 
              !status?.isStarted &&
              !status?.isCompleted && 
              operationSteps[index - 1] && 
              !operationStatuses[operationSteps[index - 1].code.toLowerCase()]?.isCompleted;
            
            const isActive = activeTab === opCode;
            
            return (
              <button 
                key={step.code} 
                onClick={() => !isDisabled && handleTabChange(step.code.toLowerCase())}
                disabled={isDisabled}
                className={`relative h-10 flex items-center justify-center rounded-md transition-all ${
                  status?.isCompleted ? 'bg-green-500 dark:bg-green-600 text-white' : 
                  status?.isStarted ? 'bg-blue-500 dark:bg-blue-600 text-white' : 
                  isActive ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                } ${isActive ? 'ring-2 ring-purple-500 dark:ring-purple-400 ring-offset-1 dark:ring-offset-gray-800' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="hidden md:flex items-center gap-1">
                  {status?.isCompleted && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                  {status?.isStarted && !status?.isCompleted && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white animate-pulse">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  )}
                  <span>{step.name}</span>
                  {status?.isCompleted && !isAdmin && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300 dark:text-yellow-200 ml-1">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  )}
                </div>
                <div className="md:hidden flex flex-col items-center text-xs">
                  <span>{step.code}</span>
                  {status?.isCompleted && !isAdmin && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300 dark:text-yellow-200 mt-1">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  )}
                </div>
                {index < operationSteps.length - 1 && (
                  <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 md:block hidden z-10">→</div>
                )}
              </button>
            );
          })
        ) : (
          <div className="col-span-5 bg-gray-50 dark:bg-gray-800 py-2 flex items-center justify-center dark:text-gray-300">Loading...</div>
        )}
      </div>
    </div>
  );
} 