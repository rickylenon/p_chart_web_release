import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Layout from '@/components/layout/DashboardLayout';
import { withAuth } from '@/lib/clientAuth';
import PageHeader from '@/components/layout/PageHeader';
import api from '@/lib/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, User, Briefcase, Mail, Shield, Clock, Edit, Save } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Form validation schema
const profileFormSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable(),
  department: z.string().optional().nullable(),
  password: z.union([
    z.string().min(6, "Password must be at least 6 characters"),
    z.string().length(0)
  ]).optional(),
  confirmPassword: z.union([
    z.string().min(1, "Please confirm your password"),
    z.string().length(0)
  ]).optional()
}).refine(data => {
  // Only validate passwords if a new password is being set
  if (data.password && data.password.length > 0) {
    // Require confirmation if password is provided
    if (!data.confirmPassword || data.confirmPassword.length === 0) {
      return false;
    }
    // Check if passwords match
    if (data.password !== data.confirmPassword) {
      return false;
    }
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Types for user profile data
interface UserProfile {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
  department: string | null;
  isActive: boolean;
  lastLogin: string | null;
  stats: {
    operationsCount: number;
  };
  recentActivity: Array<{
    id: string;
    operation: string;
    poNumber: string;
    itemName: string;
    startTime: string | null;
    endTime: string | null;
    timestamp: string;
  }>;
  isLimitedData?: boolean;
}

function Profile() {
  const { data: session } = useSession();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
      department: '',
      password: '',
      confirmPassword: ''
    }
  });

  // Fetch profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        console.log('Fetching user profile data');
        setLoading(true);
        const response = await api.get<UserProfile>('/api/me');
        console.log('Profile data received:', response.data);
        setProfileData(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching profile data:', err);
        setError(err.message || 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  // Reset form with profile data when opened
  useEffect(() => {
    if (profileData && isEditDialogOpen) {
      form.reset({
        name: profileData.name || '',
        email: profileData.email || '',
        department: profileData.department || '',
        password: '',
        confirmPassword: ''
      });
    }
  }, [isEditDialogOpen, profileData, form]);

  const handleEditProfile = async (data: ProfileFormValues) => {
    console.log('Submitting profile update:', data);
    setIsSubmitting(true);
    
    try {
      // Remove confirmPassword field before sending to API
      const { confirmPassword, ...updateData } = data;
      
      // If password is empty, don't send it to the API
      if (!updateData.password) {
        delete updateData.password;
      }
      
      const response = await api.put<UserProfile>('/api/me', updateData);
      console.log('Profile updated successfully:', response.data);
      
      // Update local state with the new data
      setProfileData(prev => {
        if (!prev) return response.data;
        return {
          ...response.data,
          // Keep recent activity data since the API doesn't return it on update
          recentActivity: prev.recentActivity
        };
      });
      
      // Close dialog and show success message
      setIsEditDialogOpen(false);
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast({
        title: "Update failed",
        description: err.response?.data?.error || "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get user initials for avatar
  const getUserInitials = (name: string | null): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Format date with fallback
  const formatDate = (date: string | null): string => {
    if (!date) return 'Never';
    return format(new Date(date), 'PPP');
  };

  // Define columns for the activity table
  const activityColumns: Column<UserProfile['recentActivity'][0]>[] = [
    {
      key: "operation",
      header: "Operation",
      sortable: true,
    },
    {
      key: "poNumber",
      header: "PO Number",
      sortable: true,
    },
    {
      key: "itemName",
      header: "Item Name",
      sortable: true,
    },
    {
      key: "startTime",
      header: "Start Time",
      sortable: true,
      render: (activity) => activity.startTime ? format(new Date(activity.startTime), 'PPp') : '-',
    },
    {
      key: "endTime",
      header: "End Time",
      sortable: true,
      render: (activity) => activity.endTime ? format(new Date(activity.endTime), 'PPp') : '-',
    },
    {
      key: "timestamp",
      header: "Recorded At",
      sortable: true,
      render: (activity) => format(new Date(activity.timestamp), 'PPp'),
    },
  ];

  return (
    <DashboardLayout>
      <div className="py-6">
      <PageHeader 
        title="User Profile" 
        description="View and manage your profile information"
        actions={
          <Button 
            onClick={() => setIsEditDialogOpen(true)} 
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-red-500">
              <p>{error}</p>
              <p className="text-sm mt-2">Please try refreshing the page.</p>
            </div>
          </CardContent>
        </Card>
      ) : profileData ? (
        <div className="space-y-6">
          {/* Profile Summary Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <Avatar className="h-24 w-24 border-2 border-primary/10">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-2xl">
                    {getUserInitials(profileData.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-semibold">{profileData.name || profileData.username}</h2>
                    <p className="text-gray-500">{profileData.username}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Shield className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Role:</span> 
                      <Badge variant="outline">{profileData.role}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Email:</span> 
                      <span className="text-gray-600">{profileData.email || 'Not set'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-700">
                      <Briefcase className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Department:</span> 
                      <span className="text-gray-600">{profileData.department || 'Not set'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Last Login:</span> 
                      <span className="text-gray-600">{formatDate(profileData.lastLogin)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Operations:</span> 
                      <span className="text-gray-600">{profileData.stats.operationsCount}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-700">
                      <User className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Status:</span> 
                      {profileData.isActive ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Section */}
          <Tabs defaultValue="recent-activity" className="w-full">
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="recent-activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recent-activity" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Your most recent operations in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profileData.recentActivity && profileData.recentActivity.length > 0 ? (
                    <DataTable
                      data={profileData.recentActivity}
                      columns={activityColumns}
                      keyField="id"
                      isLoading={false}
                      emptyMessage="No recent activity found."
                    />
                  ) : (
                    <div className="py-4 text-center text-gray-500">
                      No recent activity found
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="statistics" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Statistics</CardTitle>
                  <CardDescription>
                    Overview of your activity in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-gray-500 text-sm">Total Operations</p>
                          <p className="text-3xl font-bold text-purple-600">{profileData.stats.operationsCount}</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Additional statistics cards can be added here */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-gray-500 text-sm">Last Activity</p>
                          <p className="text-xl font-medium text-gray-800">
                            {profileData.recentActivity && profileData.recentActivity.length > 0 
                              ? format(new Date(profileData.recentActivity[0].timestamp), 'PP')
                              : 'No activity'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-gray-500 text-sm">Account Status</p>
                          <p className={`text-xl font-medium ${profileData.isActive ? 'text-green-600' : 'text-red-600'}`}>
                            {profileData.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {profileData.isLimitedData && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-amber-600 flex items-center gap-2">
                  <p className="text-sm">
                    Note: Only limited profile data is currently available. Some information may be missing.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information here. Password changes are optional.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditProfile)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your department" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  Change Password
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">Optional</span>
                </h4>
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave blank to keep current password
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-opacity-50 border-t-transparent rounded-full" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(Profile); 