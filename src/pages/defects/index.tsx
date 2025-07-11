import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Head from 'next/head';
import { debounce } from 'lodash';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { withAdminAuth } from '@/lib/clientAuth';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Pencil, CheckCircle, XCircle } from 'lucide-react';

interface Defect {
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

function Defects() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [defects, setDefects] = useState<Defect[]>([]);
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

  // Fetch filter options (categories and operations)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/defects/filters');
        
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

  // Fetch defects with pagination and filters
  const fetchDefects = useCallback(async () => {
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
      
      console.log('Fetching defects with params:', Object.fromEntries(params.entries()));
      
      const response = await fetch(`/api/defects?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch defects');
      }
      
      const result: PaginatedResult<Defect> = await response.json();
      console.log('Fetched defects data:', result);
      
      setDefects(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Error fetching defects:', err);
      setError('Failed to load defects. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, categoryFilter, operationFilter, searchQuery, statusFilter, sortField, sortDirection]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDefects();
    }
  }, [status, fetchDefects]);

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

  const handleAddDefect = () => {
    router.push('/defects/add');
  };

  const handleEditDefect = (id: number) => {
    router.push(`/defects/edit/${id}`);
  };

  const handleToggleDefectStatus = async (id: number, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'deactivate' : 'activate';
      
      // Get authentication headers from the session
      const authHeaders = {
        'Content-Type': 'application/json',
        // Use the session cookie which is automatically included in fetch requests to same origin
      };
      
      console.log(`Toggling defect ${id} status to ${!currentStatus ? 'active' : 'inactive'}`);
      
      const response = await fetch(`/api/defects/${id}/${action}`, {
        method: 'PUT',
        headers: authHeaders,
        credentials: 'include', // Important: include credentials (cookies) in the request
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API error (${response.status}):`, errorData);
        throw new Error(`Failed to ${action} defect`);
      }
      
      // Update the local state instead of refetching
      setDefects(defects.map(defect => 
        defect.id === id ? { ...defect, isActive: !currentStatus } : defect
      ));
      
      // Show success message
      setError(null);
    } catch (err) {
      console.error(`Error toggling defect status:`, err);
      setError('Failed to update defect status. Please try again.');
    }
  };

  // Define columns for the DataTable
  const columns: Column<Defect>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      render: (defect) => defect.category || 'N/A',
    },
    {
      key: "applicableOperation",
      header: "Operation",
      sortable: true,
      render: (defect) => defect.applicableOperation || 'N/A',
    },
    {
      key: "machine",
      header: "Machine",
      sortable: true,
      render: (defect) => defect.machine || 'N/A',
    },
    {
      key: "reworkable",
      header: "Reworkable",
      sortable: true,
      render: (defect) => defect.reworkable ? 'Yes' : 'No',
    },
    {
      key: "isActive",
      header: "Status",
      sortable: true,
      render: (defect) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          defect.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {defect.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (defect) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditDefect(defect.id)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleDefectStatus(defect.id, defect.isActive)}
            className={defect.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
          >
            {defect.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
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
              <Button
                onClick={handleAddDefect}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Add New Defect
              </Button>
            }
          />

          {/* Advanced filters */}
          <div className="mb-6 p-4 bg-white shadow rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 mb-1">
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
                <label htmlFor="operationFilter" className="block text-sm font-medium text-gray-700 mb-1">
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
                <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
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
            data={defects}
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

export default withAdminAuth(Defects); 