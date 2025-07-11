import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { withAdminAuth } from '@/lib/clientAuth';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/layout/PageHeader';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  applicableOperation: z.string().min(1, 'Operation is required'),
  reworkable: z.boolean().default(false),
  machine: z.string().optional(),
});

function AddMasterDefect() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationSteps, setOperationSteps] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      applicableOperation: '',
      reworkable: false,
      machine: '',
    },
  });

  // Fetch existing categories and operations for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/master-defects');
        
        if (!response.ok) {
          throw new Error('Failed to fetch master defects');
        }
        
        const data = await response.json();
        
        // Extract unique categories
        const uniqueCategories = [...new Set(data.data.map((item: any) => item.category).filter(Boolean))] as string[];
        setCategories(uniqueCategories);
        
        // Fetch operation steps
        const stepsResponse = await fetch('/api/operation-steps');
        
        if (!stepsResponse.ok) {
          throw new Error('Failed to fetch operation steps');
        }
        
        const stepsData = await stepsResponse.json();
        setOperationSteps(stepsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load form data. Please try again later.');
      }
    };
    
    fetchData();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Submitting form with values:', values);
      
      const response = await fetch('/api/master-defects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create master defect');
      }
      
      console.log('Master defect created successfully');
      router.push('/master-defects');
    } catch (err: any) {
      console.error('Error creating master defect:', err);
      setError(err.message || 'Failed to create master defect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <PageHeader 
          title="Add Master Defect" 
          description="Create a new master defect in the system"
          actions={
            <Button
              onClick={() => router.push('/master-defects')}
              variant="outline"
            >
              Cancel
            </Button>
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter defect name" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unique identifier for this master defect
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                            <SelectItem value="SMT">SMT</SelectItem>
                            <SelectItem value="Assembly">Assembly</SelectItem>
                            <SelectItem value="Material">Material</SelectItem>
                            <SelectItem value="Soldering">Soldering</SelectItem>
                            <SelectItem value="Testing">Testing</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicableOperation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applicable Operation</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select operation" />
                          </SelectTrigger>
                          <SelectContent>
                            {operationSteps.map(step => (
                              <SelectItem key={step.operationNumber} value={step.operationNumber}>
                                {step.operationNumber} - {step.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="machine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Machine</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter machine type" {...field} />
                      </FormControl>
                      <FormDescription>
                        Machine type associated with this defect (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter detailed description" 
                          className="min-h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reworkable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Reworkable</FormLabel>
                        <FormDescription>
                          Indicates if this type of defect can be reworked
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/master-defects')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {loading ? 'Creating...' : 'Create Master Defect'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAdminAuth(AddMasterDefect); 