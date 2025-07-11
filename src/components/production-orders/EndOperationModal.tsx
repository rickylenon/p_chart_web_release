import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EndOperationModalProps {
  showEndOperationModal: boolean;
  activeTab: string;
  lineNo: string;
  rfValue: string;
  isCompletingOperation: boolean;
  setLineNo: (value: string) => void;
  setShowEndOperationModal: (show: boolean) => void;
  submitCompleteOperation: () => void;
}

export function EndOperationModal({
  showEndOperationModal,
  activeTab,
  lineNo,
  rfValue,
  isCompletingOperation,
  setLineNo,
  setShowEndOperationModal,
  submitCompleteOperation,
}: EndOperationModalProps) {
  const [lineOptions, setLineOptions] = useState<string[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch line options when modal opens or activeTab changes
  useEffect(() => {
    if (showEndOperationModal) {
      fetchLineOptions();
    }
  }, [showEndOperationModal, activeTab]);

  // Fetch operation-specific line numbers
  const fetchLineOptions = async () => {
    try {
      setIsLoadingLines(true);
      setFetchError(null);
      console.log(`Fetching line number options for operation: ${activeTab}`);

      // Call the operation-lines API with the current operation
      const response = await fetch(
        `/api/operation-lines?operation=${activeTab}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch line options");
      }

      const data = await response.json();
      console.log("Operation-specific line options fetched:", data.lines);

      if (data.lines && data.lines.length > 0) {
        setLineOptions(data.lines);
      } else {
        console.log(
          "No operation-specific lines found, falling back to generic options"
        );
        await fetchFallbackLineOptions();
      }
    } catch (error) {
      console.error("Error fetching operation-specific line options:", error);
      setFetchError(
        "Failed to load line options. Using generic options instead."
      );
      // Fall back to the generic filter options if operation-specific ones fail
      await fetchFallbackLineOptions();
    } finally {
      setIsLoadingLines(false);
    }
  };

  // Fallback to generic line options if operation-specific ones fail
  const fetchFallbackLineOptions = async () => {
    try {
      console.log("Falling back to generic line options");

      const response = await fetch("/api/dashboard/filter-options");
      if (!response.ok) {
        throw new Error("Failed to fetch fallback line options");
      }

      const data = await response.json();
      console.log("Fallback line options fetched:", data.lines);
      setLineOptions(data.lines || []);
    } catch (error) {
      console.error("Error fetching fallback line options:", error);
      setLineOptions([]);
    }
  };

  const handleLineInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLineNo(value);
    setShowSuggestions(value.length > 0);
  };

  const handleLineSelect = (selectedLine: string) => {
    console.log("Selected line:", selectedLine);
    setLineNo(selectedLine);
    setShowSuggestions(false);
  };

  if (!showEndOperationModal) return null;

  // Case-insensitive filtering of line options
  const filteredLines = lineOptions.filter((line) =>
    line?.toLowerCase().includes(lineNo.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          End Operation: {activeTab.toUpperCase()}
        </h2>

        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Line Number *
            </label>
            {fetchError && (
              <p className="text-xs text-amber-600 mb-1">{fetchError}</p>
            )}
            <Input
              type="text"
              value={lineNo}
              onChange={handleLineInputChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Enter line number"
              required
              className="dark:bg-gray-800 dark:text-white"
            />

            {/* Line number suggestions dropdown */}
            {showSuggestions && (
              <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                {isLoadingLines ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                  </div>
                ) : (
                  <>
                    {filteredLines.length > 0 ? (
                      filteredLines.map((line, index) => (
                        <div
                          key={index}
                          className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm dark:text-white"
                          onClick={() => handleLineSelect(line)}
                        >
                          {line}
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No matching lines found
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Current Resource Factor (RF): {rfValue}
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setShowEndOperationModal(false)}
            disabled={isCompletingOperation}
            className="dark:text-white"
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={submitCompleteOperation}
            disabled={isCompletingOperation || !lineNo.trim()}
          >
            {isCompletingOperation ? (
              <div className="flex items-center">
                <span className="animate-spin mr-2">⟳</span> Processing...
              </div>
            ) : (
              "End Operation"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
