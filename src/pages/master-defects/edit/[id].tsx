import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Head from 'next/head';
import { withAdminAuth } from '@/lib/clientAuth';

interface Operation {
  code: string;
  name: string;
  sequence: number;
}

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

function EditDefect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [applicableOperation, setApplicableOperation] = useState('');
  const [machine, setMachine] = useState('');
  const [reworkable, setReworkable] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    console.log('Session status:', status);
    console.log('User role:', session?.user?.role);
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router, session]);

  // Fetch the defect data
  useEffect(() => {
    const fetchDefect = async () => {
      if (!id) return;
      
      try {
        setFetchLoading(true);
        const response = await fetch(`/api/defects/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch defect');
        }
        
        const data = await response.json();
        console.log('Fetched defect:', data);
        
        // Populate form fields
        setName(data.name || '');
        setDescription(data.description || '');
        setCategory(data.category || '');
        setApplicableOperation(data.applicableOperation || '');
        setMachine(data.machine || '');
        setReworkable(data.reworkable || false);
        setIsActive(data.isActive);
      } catch (err) {
        console.error('Error fetching defect:', err);
        setError('Failed to load defect details');
      } finally {
        setFetchLoading(false);
      }
    };

    if (status === 'authenticated' && id) {
      fetchDefect();
    }
  }, [status, id]);

  // Fetch operations and categories when the component mounts
  useEffect(() => {
    const fetchOperations = async () => {
      try {
        const response = await fetch('/api/operation-steps');
        if (!response.ok) {
          throw new Error('Failed to fetch operations');
        }
        const data = await response.json();
        console.log('Fetched operations:', data);
        setOperations(data);
      } catch (err) {
        console.error('Error fetching operations:', err);
        setError('Failed to load operations');
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/defects');
        if (!response.ok) {
          throw new Error('Failed to fetch defects');
        }
        const data = await response.json();
        console.log('Fetched defects for categories:', data);
        
        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(data.map((d: any) => d.category).filter(Boolean))
        );
        
        setCategories(uniqueCategories as string[]);
      } catch (err) {
        console.error('Error fetching categories:', err);
        // Don't set error here since we already have an error state for operations
      }
    };

    if (status === 'authenticated') {
      fetchOperations();
      fetchCategories();
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!name.trim()) {
      setError('Defect name is required');
      return;
    }
    
    if (!applicableOperation) {
      setError('Applicable operation is required');
      return;
    }
    
    const finalCategory = category === 'new' && newCategory.trim() 
      ? newCategory.trim() 
      : category;
    
    if (!finalCategory) {
      setError('Category is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/defects/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category: finalCategory,
          applicableOperation,
          machine: machine.trim() || null,
          reworkable,
          isActive,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update defect');
      }
      
      const data = await response.json();
      console.log('Updated defect:', data);
      
      setSuccess('Defect updated successfully!');
      
      // Redirect to defects list after a short delay
      setTimeout(() => {
        router.push('/defects');
      }, 2000);
    } catch (err: any) {
      console.error('Error updating defect:', err);
      setError(err.message || 'Failed to update defect');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || fetchLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Defect - P-Chart System</title>
      </Head>
      <DashboardLayout>
        <div className="py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Edit Defect</h1>
                <button
                  onClick={() => router.push('/defects')}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Back to List
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name*
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded shadow-sm"
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category*
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded shadow-sm"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="new">+ Add New Category</option>
                  </select>
                </div>

                {category === 'new' && (
                  <div>
                    <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700 mb-1">
                      New Category*
                    </label>
                    <input
                      type="text"
                      id="newCategory"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded shadow-sm"
                      required
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="applicableOperation" className="block text-sm font-medium text-gray-700 mb-1">
                    Applicable Operation*
                  </label>
                  <select
                    id="applicableOperation"
                    value={applicableOperation}
                    onChange={(e) => setApplicableOperation(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded shadow-sm"
                    required
                  >
                    <option value="">Select Operation</option>
                    {operations.map((op) => (
                      <option key={op.code} value={op.code}>
                        {op.code} - {op.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="machine" className="block text-sm font-medium text-gray-700 mb-1">
                    Machine
                  </label>
                  <input
                    type="text"
                    id="machine"
                    value={machine}
                    onChange={(e) => setMachine(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded shadow-sm"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="reworkable"
                    checked={reworkable}
                    onChange={(e) => setReworkable(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="reworkable" className="ml-2 block text-sm text-gray-700">
                    Reworkable (can be fixed)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    Active
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Update Defect'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

export default withAdminAuth(EditDefect); 