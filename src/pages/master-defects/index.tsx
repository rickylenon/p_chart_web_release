import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Head from 'next/head';
import { debounce } from 'lodash';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { withAdminAuth } from '@/lib/clientAuth';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Pencil, CheckCircle, XCircle, FileSpreadsheet, Upload, Download, FileDown, FileUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MasterDefect {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  applicableOperation: string | null;
  reworkable: boolean;
  machine: string | null;
  isActive: boolean;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

function MasterDefects() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [masterDefects, setMasterDefects] = useState<MasterDefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [operations, setOperations] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch filter options (categories and operations)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/master-defects/filters');
        
        if (!response.ok) {
          throw new Error('Failed to fetch filter options');
        }
        
        const data = await response.json();
        console.log('Fetched filter options:', data);
        setCategories(data.categories || []);
        setOperations(data.operations || []);
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };

    if (status === 'authenticated') {
      fetchFilterOptions();
    }
  }, [status]);

  // Fetch master defects with pagination and filters
  const fetchMasterDefects = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (categoryFilter) params.append('category', categoryFilter);
      if (operationFilter) params.append('operation', operationFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('active', statusFilter);
      if (sortField) params.append('sortField', sortField);
      if (sortDirection) params.append('sortDirection', sortDirection);
      
      console.log('Fetching master defects with params:', Object.fromEntries(params.entries()));
      
      const response = await fetch(`/api/master-defects?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch master defects');
      }
      
      const result: PaginatedResult<MasterDefect> = await response.json();
      console.log('Fetched master defects data:', result);
      
      setMasterDefects(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Error fetching master defects:', err);
      setError('Failed to load master defects. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, categoryFilter, operationFilter, searchQuery, statusFilter, sortField, sortDirection]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMasterDefects();
    }
  }, [status, fetchMasterDefects]);

  // Debounced search handler
  const debouncedSearch = useCallback(
    (value: string) => {
      console.log('Debounced search with value:', value);
      setSearchQuery(value);
      setPage(1); // Reset to first page on new search
    },
    [setSearchQuery, setPage]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('Search input changed:', value);
    setSearchInput(value);
    debounce(() => debouncedSearch(value), 500)();
  };

  const handleFilterChange = (type: string, value: string) => {
    switch (type) {
      case 'category':
        setCategoryFilter(value);
        break;
      case 'operation':
        setOperationFilter(value);
        break;
      case 'status':
        setStatusFilter(value);
        break;
      default:
        break;
    }
    setPage(1); // Reset to first page on filter change
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    console.log(`Sorting by ${field} in ${direction} order`);
    setSortField(field);
    setSortDirection(direction);
  };

  const handleAddMasterDefect = () => {
    router.push('/master-defects/add');
  };

  const handleEditMasterDefect = (id: number) => {
    router.push(`/master-defects/edit/${id}`);
  };

  const handleToggleMasterDefectStatus = async (id: number, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'deactivate' : 'activate';
      
      // Get authentication headers from the session
      const authHeaders = {
        'Content-Type': 'application/json',
        // Use the session cookie which is automatically included in fetch requests to same origin
      };
      
      console.log(`Toggling master defect ${id} status to ${!currentStatus ? 'active' : 'inactive'}`);
      
      const response = await fetch(`/api/master-defects/${id}/${action}`, {
        method: 'PUT',
        headers: authHeaders,
        credentials: 'include', // Important: include credentials (cookies) in the request
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API error (${response.status}):`, errorData);
        throw new Error(`Failed to ${action} master defect`);
      }
      
      // Update the local state instead of refetching
      setMasterDefects(masterDefects.map(masterDefect => 
        masterDefect.id === id ? { ...masterDefect, isActive: !currentStatus } : masterDefect
      ));
      
      // Show success message
      setError(null);
    } catch (err) {
      console.error('Error toggling master defect status:', err);
      setError(`Failed to update master defect status. Please try again.`);
    }
  };

  const handleExportToExcel = async () => {
    try {
      console.log('Initiating Excel export');
      
      // Using window.location to trigger file download
      window.location.href = '/api/master-defects/export';
      
      toast.success('Exporting master defects to Excel');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export master defects');
    }
  };

  const handleImportFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      console.log('Initiating Excel import');
      const files = event.target.files;
      if (!files || files.length === 0) {
        console.log('No file selected');
        return;
      }
      
      const file = files[0];
      console.log(`Selected file: ${file.name}, size: ${file.size} bytes`);
      
      setIsImporting(true);
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      
      // Send to API
      const response = await fetch('/api/master-defects/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import file');
      }
      
      const result = await response.json();
      console.log('Import result:', result);
      
      // Show success message
      toast.success(result.message || 'Import completed successfully');
      
      // Refresh the data
      fetchMasterDefects();
    } catch (error) {
      console.error('Error importing from Excel:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import master defects');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDownloadTemplate = () => {
    try {
      console.log('Downloading import template');
      window.location.href = '/api/master-defects/template';
      toast.success('Downloading template file');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    }
  };

  // Define columns for the DataTable
  const columns: Column<MasterDefect>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      render: (masterDefect) => masterDefect.category || 'N/A',
    },
    {
      key: "applicableOperation",
      header: "Operation",
      sortable: true,
      render: (masterDefect) => masterDefect.applicableOperation || 'N/A',
    },
    {
      key: "machine",
      header: "Machine",
      sortable: true,
      render: (masterDefect) => masterDefect.machine || 'N/A',
    },
    {
      key: "reworkable",
      header: "Reworkable",
      sortable: true,
      render: (masterDefect) => masterDefect.reworkable ? 'Yes' : 'No',
    },
    {
      key: "isActive",
      header: "Status",
      sortable: true,
      render: (masterDefect) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          masterDefect.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {masterDefect.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (masterDefect) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditMasterDefect(masterDefect.id)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleMasterDefectStatus(masterDefect.id, masterDefect.isActive)}
            className={masterDefect.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
          >
            {masterDefect.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Head>
        <title>Defects Management - P-Chart System</title>
      </Head>
      <DashboardLayout>
        <div className="py-6">
          <PageHeader
            title="Defects Management"
            description="Add and manage defect categories for quality control"
            searchPlaceholder="Search by name, description, etc."
            searchValue={searchInput}
            onSearchChange={handleSearchChange}
            actions={
              <div className="flex space-x-2">
                <Button
                  onClick={handleExportToExcel}
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      disabled={isImporting}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isImporting ? 'Importing...' : 'Import'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleImportButtonClick}>
                      <FileUp className="h-4 w-4 mr-2" />
                      Upload Excel File
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadTemplate}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Download Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFromExcel}
                  accept=".xlsx,.xls"
                  className="hidden"
                  aria-label="Import Excel file"
                />
                <Button
                  onClick={handleAddMasterDefect}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Add New Defect
                </Button>
              </div>
            }
          />

          {/* Advanced filters */}
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Category
                </label>
                <select
                  id="categoryFilter"
                  value={categoryFilter}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded shadow-sm"
                  aria-label="Filter by category"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="operationFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Operation
                </label>
                <select
                  id="operationFilter"
                  value={operationFilter}
                  onChange={(e) => handleFilterChange('operation', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded shadow-sm"
                  aria-label="Filter by operation"
                >
                  <option value="">All Operations</option>
                  {operations.map(operation => (
                    <option key={operation} value={operation}>{operation}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Status
                </label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded shadow-sm"
                  aria-label="Filter by status"
                >
                  <option value="">All Statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <DataTable
            data={masterDefects}
            columns={columns}
            keyField="id"
            isLoading={loading}
            error={error || undefined}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            pagination={{
              currentPage: page,
              totalPages: totalPages,
              totalItems: total,
              itemsPerPage: limit,
              onPageChange: (newPage) => setPage(newPage),
              onItemsPerPageChange: (newLimit) => {
                setLimit(newLimit);
                setPage(1); // Reset to first page when changing limit
              }
            }}
            emptyMessage="No defects found matching the current filters."
          />
        </div>
      </DashboardLayout>
    </>
  );
}

export default withAdminAuth(MasterDefects); 