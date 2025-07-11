import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle } from "lucide-react";

interface AuditLog {
  id: number;
  tableName: string;
  recordId: string;
  action: string;
  oldValues: any;
  newValues: any;
  user: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogModalProps {
  open: boolean;
  onClose: () => void;
  poNumber: string;
  operationId?: number;
  defectId?: number;
  type: 'operation' | 'defect';
  title: string;
}

export function AuditLogModal({ 
  open, 
  onClose, 
  poNumber, 
  operationId, 
  defectId,
  type, 
  title 
}: AuditLogModalProps) {
  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });

  const fetchAuditLogs = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    
    console.log(`AuditLogModal: Loading audit logs - open: ${open}, poNumber: ${poNumber}, operationId: ${operationId}, defectId: ${defectId}, type: ${type}`);
    
    try {
      // Build URL with query parameters
      let url = `/api/audit-logs/operations?`;
      
      if (type === 'defect' && defectId) {
        // If we're looking for a specific defect
        url += `defectId=${defectId}&`;
      } else if (operationId) {
        // If we're looking for an operation
        url += `operationId=${operationId}&`;
      } else if (poNumber) {
        // If we're looking at the PO level
        url += `poNumber=${poNumber}&`;
      }
      
      url += `type=${type}&limit=10&page=${page}`;
      
      console.log('Fetching audit logs with URL:', url);
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch ${type} audit logs`);
      }
      
      const data = await response.json();
      console.log(`Fetched ${data.data.length} ${type} audit logs:`, data);
      
      setLogs(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error(`Error fetching ${type} audit logs:`, error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to load audit logs',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      console.log(`AuditLogModal: Loading audit logs - open: ${open}, poNumber: ${poNumber}, operationId: ${operationId}, defectId: ${defectId}, type: ${type}`);
      fetchAuditLogs(1);
    } else {
      console.log('AuditLogModal: Not open, skipping log fetch');
    }
    // Use a stable dependency array with only the variables we need
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handlePageChange = (newPage: number) => {
    fetchAuditLogs(newPage);
  };

  // Helper to format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Helper to format values for display
  const formatValues = (values: any) => {
    if (!values) return "N/A";
    
    try {
      if (typeof values === 'string') {
        return values;
      }
      
      return JSON.stringify(values, null, 2);
    } catch (e) {
      return String(values);
    }
  };

  // Helper to render changes in a tabular format
  const renderChangesTable = (values: any) => {
    if (!values || Object.keys(values).length === 0) return <span className="text-gray-400 dark:text-gray-500">No changes</span>;
    
    const fields = Object.keys(values);
    
    // Group fields into pairs to make display more compact
    const fieldPairs = [];
    for (let i = 0; i < fields.length; i += 2) {
      if (i + 1 < fields.length) {
        fieldPairs.push([fields[i], fields[i + 1]]);
      } else {
        fieldPairs.push([fields[i]]);
      }
    }
    
    return (
      <table className="min-w-full text-xs border-collapse">
        <tbody>
          {fieldPairs.map((pair, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-900">
              {pair.map(field => (
                <React.Fragment key={field}>
                  <td className="py-1 px-2 border border-gray-200 dark:border-gray-700 font-medium bg-gray-50 dark:bg-gray-900 w-1/6">
                    {field}
                  </td>
                  <td className="py-1 px-2 border border-gray-200 dark:border-gray-700 w-1/3 break-words dark:text-gray-300">
                    {values[field] === null ? 
                      <span className="text-gray-400 dark:text-gray-500">null</span> : 
                      String(values[field])}
                  </td>
                </React.Fragment>
              ))}
              {/* If we have an odd number of fields, add empty cells to maintain layout */}
              {pair.length === 1 && (
                <>
                  <td className="py-1 px-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 w-1/6"></td>
                  <td className="py-1 px-2 border border-gray-200 dark:border-gray-700 w-1/3"></td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Helper to determine action color
  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'text-green-600 dark:text-green-400';
      case 'update':
        return 'text-blue-600 dark:text-blue-400';
      case 'delete':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Helper to filter what fields we show in changes
  const getRelevantChanges = (values: any, action: string) => {
    if (!values) return {};
    
    const relevantFields = ['quantity', 'quantityRework', 'quantityNogood', 'defectName', 'startTime', 'endTime', 'inputQuantity', 'outputQuantity', 'rf', 'lineNo'];
    
    // For create actions, we want to show all fields
    if (action.toLowerCase() === 'create') {
      return values;
    }
    
    // For update actions, we want to filter to relevant fields
    return Object.keys(values)
      .filter(key => relevantFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = values[key];
        return obj;
      }, {} as Record<string, any>);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription>
            Audit logs show a history of all changes made to this {type === 'operation' ? 'operation' : 'defect'}.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" />
            <span className="ml-2 text-gray-500 dark:text-gray-400">Loading audit logs...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-gray-50 dark:bg-black p-6 rounded-md text-center">
            <p className="text-gray-500 dark:text-gray-400">No audit logs found for this {type === 'operation' ? 'operation' : 'defect'}.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Timestamp</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                  <TableHead className="w-[100px]">User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    {/* First row: Timestamp, Action, User */}
                    <TableRow className="border-t-2 border-t-gray-300 dark:border-t-gray-700">
                      <TableCell className="font-mono text-xs dark:text-gray-300">
                        {formatDate(log.timestamp)}
                      </TableCell>
                      <TableCell className={getActionColor(log.action)}>
                        {log.action}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">{log.user}</TableCell>
                    </TableRow>
                    
                    {/* Second row: From data (for updates) or data (for creates) */}
                    <TableRow>
                      <TableCell colSpan={3} className="p-2 bg-gray-50 dark:bg-gray-900">
                        <div className="flex items-center mb-1">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {log.action.toLowerCase() === 'update' ? 'From:' : 'Data:'}
                          </div>
                        </div>
                        <div className="rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                          {renderChangesTable(getRelevantChanges(log.action.toLowerCase() === 'update' ? log.oldValues : (log.newValues || log.oldValues), log.action))}
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Third row: To data (only for updates) */}
                    {log.action.toLowerCase() === 'update' && (
                      <TableRow className="border-b-2 border-b-gray-200 dark:border-b-gray-700">
                        <TableCell colSpan={3} className="p-2 bg-gray-50 dark:bg-gray-900">
                          <div className="flex items-center mb-1">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">To:</div>
                          </div>
                          <div className="rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                            {renderChangesTable(getRelevantChanges(log.newValues, log.action))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {/* Add some spacing between audit log entries if not an update */}
                    {log.action.toLowerCase() !== 'update' && (
                      <TableRow className="border-b-2 border-b-gray-200 dark:border-b-gray-700">
                        <TableCell colSpan={3} className="p-0 h-2"></TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            
            {pagination.pages > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => pagination.page > 1 && handlePageChange(pagination.page - 1)}
                      className={pagination.page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                    // Show first page, last page, current page, and pages around current
                    const currentPage = pagination.page;
                    const totalPages = pagination.pages;
                    
                    // Show first page, last page, current page and one on either side of current
                    let pagesToShow = [1];
                    
                    if (currentPage > 2) pagesToShow.push(currentPage - 1);
                    if (currentPage > 1 && currentPage < totalPages) pagesToShow.push(currentPage);
                    if (currentPage < totalPages - 1) pagesToShow.push(currentPage + 1);
                    if (totalPages > 1) pagesToShow.push(totalPages);
                    
                    // Remove duplicates and sort
                    pagesToShow = [...new Set(pagesToShow)].sort((a, b) => a - b);
                    
                    return pagesToShow.map((page, index) => {
                      // Add ellipsis where needed
                      if (index > 0 && page > pagesToShow[index - 1] + 1) {
                        return (
                          <React.Fragment key={`ellipsis-${index}`}>
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => handlePageChange(page)}
                                isActive={page === currentPage}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        );
                      }
                      
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={page === currentPage}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    });
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => pagination.page < pagination.pages && handlePageChange(pagination.page + 1)}
                      className={pagination.page >= pagination.pages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 