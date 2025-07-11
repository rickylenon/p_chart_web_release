import Layout from "@/components/layout/Layout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Database,
  ShieldAlert,
  Upload,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { UserSession, fetchWithAuth } from "@/lib/clientAuth";
import * as XLSX from "xlsx";

export default function Settings() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Operation lines upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"update" | "replace">("update");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is Excel
      const isExcel =
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel" ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls");

      if (!isExcel) {
        toast({
          title: "Invalid file type",
          description: "Please select an Excel file (.xlsx or .xls)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setUploadResults(null);
    }
  };

  const handleUploadOperationLines = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to upload",
        variant: "destructive",
      });
      return;
    }

    const modeText =
      uploadMode === "replace" ? "replace all existing" : "update existing";
    if (
      !confirm(
        `Are you sure you want to ${modeText} operation lines? ${
          uploadMode === "replace"
            ? "This will delete all existing records and replace them with the Excel data."
            : "This will add new records from the Excel file, skipping any that already exist."
        }`
      )
    ) {
      return;
    }

    setIsUploading(true);
    setUploadResults(null);

    try {
      // Read file as array buffer and convert to base64
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64String = Buffer.from(arrayBuffer).toString("base64");

      console.log("Uploading operation lines...");
      console.log("Mode:", uploadMode);
      console.log("File size:", selectedFile.size);

      const response = await fetchWithAuth(
        "/api/admin/upload-operation-lines",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            excelData: base64String,
            mode: uploadMode,
          }),
        }
      );

      console.log("Upload response status:", response.status);

      const data = await response.json();
      console.log("Upload response:", data);

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
          variant: "default",
        });
        setUploadResults(data.data);

        // Reset file input
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        console.error("Error uploading operation lines:", data.error);
        toast({
          title: "Error",
          description: data.error || "Failed to upload operation lines",
          variant: "destructive",
        });

        // Show validation errors if available
        if (data.details && Array.isArray(data.details)) {
          setUploadResults({ errors: data.details });
        }
      }
    } catch (error) {
      console.error("Error calling upload API:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadSampleExcel = () => {
    // Create sample data
    const sampleData = [
      ["OP10", "OP15", "OP20", "OP30", "OP40"],
      [
        "Machine #1",
        "MX34 Harness",
        "MX34 Harness",
        "BUNDLE L1A",
        "Terminal 1",
      ],
      [
        "Machine #2",
        "MX39 Harness",
        "MX39 Harness",
        "BUNDLE L1B",
        "Terminal 2",
      ],
      [
        "Machine #3",
        "MX39B/45 Harness",
        "MX39B/45 Harness",
        "BUNDLE L2A",
        "Terminal 3",
      ],
      ["Machine #4", "MX39D Harness", "MX39D Harness", "BUNDLE L2B", ""],
      ["Machine #5", "MX39F Harness", "MX39F Harness", "HITORI YATAI L1", ""],
      ["Machine #6", "MX40 Harness", "MX40 Harness", "HITORI YATAI L2", ""],
      [
        "MY79 Cable Pre-Process",
        "MX55J Cable Pre-Process FG L1",
        "MX55J Cable Pre-Process FG L1",
        "HITORI YATAI L3",
        "",
      ],
      [
        "",
        "MX55J Cable Pre-Process FG L2",
        "MX55J Cable Pre-Process FG L2",
        "HITORI YATAI L4",
        "",
      ],
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Operation Lines");

    // Write and download the file
    XLSX.writeFile(workbook, "operation_lines_sample.xlsx");

    toast({
      title: "Sample Excel downloaded",
      description: "Operations as columns, lines as rows - ready to customize",
      variant: "default",
    });
  };

  const handleExportCurrentData = async () => {
    console.log("Exporting current operation lines data...");
    setIsExporting(true);

    try {
      const response = await fetchWithAuth(
        "/api/admin/export-operation-lines",
        {
          method: "GET",
        }
      );

      console.log("Export response status:", response.status);

      const data = await response.json();
      console.log("Export response:", data);

      if (response.ok) {
        // Convert base64 to buffer and create download
        const base64Data = data.data.excelData;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Create blob and download
        const blob = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Export successful",
          description: `Downloaded ${data.data.totalRecords} operation lines (${data.data.operationCount} operations, ${data.data.lineCount} unique lines)`,
          variant: "default",
        });

        console.log(
          `Export completed: ${data.data.totalRecords} records exported`
        );
      } else {
        console.error("Error exporting operation lines:", data.error);
        toast({
          title: "Export failed",
          description: data.error || "Failed to export operation lines",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error calling export API:", error);
      toast({
        title: "Export error",
        description: "An unexpected error occurred during export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Check if user is an admin - handle case variations
  const userRole = (session?.user as any)?.role || "";
  console.log("User session:", session);
  console.log("User role:", userRole);
  console.log("Local storage user data:", UserSession.getSession());
  const isAdmin =
    typeof userRole === "string" && userRole.toLowerCase() === "admin";

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <div className="mt-4">
            <p className="text-gray-600">Configure your preferences here.</p>
            <p className="text-xs text-gray-500 mt-2">
              Session status: {status}, Role: {userRole || "Not available"}
              <br />
              Local storage:{" "}
              {UserSession.getSession()
                ? `ID: ${UserSession.getSession()?.id}, Role: ${
                    UserSession.getSession()?.role
                  }`
                : "Not available"}
            </p>
          </div>
        </div>

        {/* Admin tools section - only visible to admin users */}
        {isAdmin ? (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              Admin Tools
              <ShieldAlert className="h-5 w-5 text-amber-500" />
            </h2>
            <div className="mt-4">
              {/* Operation Lines Upload */}
              <div>
                <h3 className="text-lg font-medium">
                  Operation Lines Management
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload an Excel file to update the operation lines database.
                  Use standard Excel format where each column represents an
                  operation (OP10, OP15, OP20, OP30, OP40) and each row contains
                  the line numbers for that operation. Empty cells are ignored.
                </p>

                <div className="space-y-4">
                  {/* Export Current Data */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Export Current Data
                        </p>
                        <p className="text-xs text-blue-700">
                          Download the current operation lines data as Excel for
                          editing
                        </p>
                      </div>
                      <Button
                        onClick={handleExportCurrentData}
                        disabled={isExporting}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="h-3 w-3" />
                            Export Current
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Sample Excel Download */}
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          Need the Excel format?
                        </p>
                        <p className="text-xs text-green-700">
                          Download a sample Excel file showing the proper format
                        </p>
                      </div>
                      <Button
                        onClick={handleDownloadSampleExcel}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-green-700 border-green-300 hover:bg-green-100"
                      >
                        <Download className="h-3 w-3" />
                        Sample Excel
                      </Button>
                    </div>
                  </div>

                  {/* Upload Mode Selection */}
                  <div>
                    <Label className="text-sm font-medium">Upload Mode</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="update"
                          name="uploadMode"
                          value="update"
                          checked={uploadMode === "update"}
                          onChange={(e) =>
                            setUploadMode(
                              e.target.value as "update" | "replace"
                            )
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          aria-label="Update records mode"
                        />
                        <Label htmlFor="update" className="text-sm">
                          <span className="font-medium">Update records</span> -
                          Insert new lines from Excel, skip existing ones
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="replace"
                          name="uploadMode"
                          value="replace"
                          checked={uploadMode === "replace"}
                          onChange={(e) =>
                            setUploadMode(
                              e.target.value as "update" | "replace"
                            )
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          aria-label="Replace all records mode"
                        />
                        <Label
                          htmlFor="replace"
                          className="text-sm text-red-600"
                        >
                          <span className="font-medium">
                            Replace all records
                          </span>{" "}
                          - Delete all existing lines and insert new ones from
                          Excel
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* File Selection */}
                  <div>
                    <Label htmlFor="excelFile" className="text-sm font-medium">
                      Select Excel File
                    </Label>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      id="excelFile"
                      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={handleFileSelect}
                      className="mt-1"
                      disabled={isUploading}
                    />
                    {selectedFile && (
                      <p className="text-sm text-gray-500 mt-1">
                        Selected: {selectedFile.name} (
                        {(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  {/* Upload Button */}
                  <Button
                    onClick={handleUploadOperationLines}
                    disabled={isUploading || !selectedFile}
                    className="flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload Operation Lines
                      </>
                    )}
                  </Button>
                </div>

                {/* Upload Results */}
                {uploadResults && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">
                      Upload Results:
                    </h4>
                    <div className="bg-gray-100 p-3 rounded text-sm">
                      {uploadResults.mode === "replace" ? (
                        <>
                          <div className="text-green-700">
                            ✓ Deleted: {uploadResults.deleted} existing records
                          </div>
                          <div className="text-green-700">
                            ✓ Inserted: {uploadResults.inserted} new records
                          </div>
                          <div className="text-gray-600">
                            Total processed: {uploadResults.total}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-green-700">
                            ✓ Inserted: {uploadResults.inserted} new records
                          </div>
                          <div className="text-blue-600">
                            • Skipped: {uploadResults.skipped} existing records
                          </div>
                          <div className="text-gray-600">
                            Total processed: {uploadResults.total}
                          </div>
                        </>
                      )}

                      {uploadResults.errors &&
                        uploadResults.errors.length > 0 && (
                          <div className="mt-2">
                            <div className="text-red-600 font-medium">
                              Errors:
                            </div>
                            <div className="max-h-32 overflow-y-auto">
                              {uploadResults.errors
                                .slice(0, 10)
                                .map((error: string, index: number) => (
                                  <div
                                    key={index}
                                    className="text-red-600 text-xs"
                                  >
                                    • {error}
                                  </div>
                                ))}
                              {uploadResults.errors.length > 10 && (
                                <div className="text-gray-500 text-xs italic">
                                  (Showing first 10 errors. Check server logs
                                  for complete details)
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
