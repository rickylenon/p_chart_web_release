"use client";

import React, { ReactNode, useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  searchable?: boolean;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: string;
  isLoading?: boolean;
  error?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  pagination?: PaginationProps;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (field: string, direction: "asc" | "desc") => void;
  emptyMessage?: string;
  className?: string;
  hideSearch?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  console.log(
    `Rendering pagination: Page ${currentPage} of ${totalPages}, showing ${itemsPerPage} items per page`
  );

  return (
    <div className="flex items-center justify-between py-4">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{" "}
        {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
      </div>
      <div className="flex items-center space-x-6">
        {onItemsPerPageChange && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Show per page
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded p-1 text-sm"
              aria-label="Items per page"
            >
              {[10, 20, 50, 100].map((value) => (
                <option key={value} value={value} className="dark:bg-gray-800">
                  {value}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            «
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Previous
          </Button>

          <div className="mx-2 text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            »
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  isLoading = false,
  error,
  searchValue: externalSearchValue,
  onSearchChange: externalOnSearchChange,
  searchPlaceholder = "Search...",
  pagination: externalPagination,
  sortField: externalSortField,
  sortDirection: externalSortDirection = "asc",
  onSortChange: externalOnSortChange,
  emptyMessage = "No results found.",
  className = "",
  hideSearch = false,
}: DataTableProps<T>) {
  // Internal state for standalone mode (when external controls are not provided)
  const [internalSearchValue, setInternalSearchValue] = useState("");
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);
  const [internalItemsPerPage, setInternalItemsPerPage] = useState(10);
  const [internalSortField, setInternalSortField] = useState<
    string | undefined
  >(undefined);
  const [internalSortDirection, setInternalSortDirection] = useState<
    "asc" | "desc"
  >("asc");

  // Determine if we're using external or internal controls
  const isExternalSearch = externalOnSearchChange !== undefined;
  const isExternalPagination = externalPagination !== undefined;
  const isExternalSorting = externalOnSortChange !== undefined;

  // Values to use based on mode
  const searchValue = isExternalSearch
    ? externalSearchValue || ""
    : internalSearchValue;
  const sortField = isExternalSorting ? externalSortField : internalSortField;
  const sortDirection = isExternalSorting
    ? externalSortDirection
    : internalSortDirection;

  // Internal handlers
  const handleInternalSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setInternalSearchValue(e.target.value);
    setInternalCurrentPage(1); // Reset to first page on search
  };

  const handleInternalSort = (field: string) => {
    if (internalSortField === field) {
      setInternalSortDirection(
        internalSortDirection === "asc" ? "desc" : "asc"
      );
    } else {
      setInternalSortField(field);
      setInternalSortDirection("asc");
    }
  };

  // External handlers
  const handleExternalSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (externalOnSearchChange) {
      externalOnSearchChange(e.target.value);
    }
  };

  const handleExternalSort = (field: string) => {
    if (externalOnSortChange) {
      if (externalSortField === field) {
        externalOnSortChange(
          field,
          externalSortDirection === "asc" ? "desc" : "asc"
        );
      } else {
        externalOnSortChange(field, "asc");
      }
    }
  };

  // Process data (search, sort, paginate)
  let processedData = [...data];

  // Apply search filtering for internal mode
  if (!isExternalSearch && searchValue) {
    const searchLower = searchValue.toLowerCase();
    const searchableColumns = columns
      .filter((col) => col.searchable !== false)
      .map((col) => col.key);

    processedData = processedData.filter((row) => {
      return searchableColumns.some((colKey) => {
        const value = row[colKey];
        return (
          value !== null &&
          value !== undefined &&
          String(value).toLowerCase().includes(searchLower)
        );
      });
    });
  }

  // Apply sorting for internal mode
  if (!isExternalSorting && sortField) {
    processedData.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === bValue) return 0;

      // Handle nulls and undefineds
      if (aValue === null || aValue === undefined)
        return sortDirection === "asc" ? -1 : 1;
      if (bValue === null || bValue === undefined)
        return sortDirection === "asc" ? 1 : -1;

      // Compare based on type
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? aValue > bValue
          ? 1
          : -1
        : aValue > bValue
        ? -1
        : 1;
    });
  }

  // Apply pagination for internal mode
  let paginatedData = processedData;
  let totalItems = processedData.length;
  let totalPages = Math.ceil(totalItems / internalItemsPerPage);

  if (!isExternalPagination) {
    const startIndex = (internalCurrentPage - 1) * internalItemsPerPage;
    const endIndex = startIndex + internalItemsPerPage;
    paginatedData = processedData.slice(startIndex, endIndex);
  }

  // Create pagination props
  const paginationProps = isExternalPagination
    ? externalPagination
    : {
        currentPage: internalCurrentPage,
        totalPages,
        totalItems,
        itemsPerPage: internalItemsPerPage,
        onPageChange: setInternalCurrentPage,
        onItemsPerPageChange: setInternalItemsPerPage,
      };

  // Helper function to render sort indicator
  const renderSortIndicator = (field: string) => {
    if (!sortField || sortField !== field) return null;

    return (
      <span className="ml-1 inline-block">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // Handle sorting click
  const handleSortClick = (field: string) => {
    if (isExternalSorting) {
      handleExternalSort(field);
    } else {
      handleInternalSort(field);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded mb-4">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="dark:hover:bg-gray-700/50">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={`${
                      column.sortable ? "cursor-pointer" : ""
                    } dark:text-gray-200`}
                    onClick={
                      column.sortable
                        ? () => handleSortClick(column.key)
                        : undefined
                    }
                  >
                    <div className="flex items-center">
                      {column.header}
                      {column.sortable &&
                        (sortField === column.key ? (
                          renderSortIndicator(column.key)
                        ) : (
                          <ArrowUpDown className="ml-1 h-4 w-4 opacity-30" />
                        ))}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isExternalPagination ? data : paginatedData).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-gray-500 dark:text-gray-400"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                (isExternalPagination ? data : paginatedData).map((row) => (
                  <TableRow
                    key={String(row[keyField])}
                    className="dark:hover:bg-gray-700/50"
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={`${String(row[keyField])}-${column.key}`}
                        className="dark:text-gray-200"
                      >
                        {column.render ? column.render(row) : row[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {(isExternalPagination ? true : totalItems > 0) && !isLoading && (
        <Pagination {...paginationProps} />
      )}
    </div>
  );
}
