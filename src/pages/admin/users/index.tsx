import { useEffect, useState } from "react";
import Layout from "@/components/layout/DashboardLayout";
import { withAdminAuth } from "@/lib/clientAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Pencil, Ban, UserPlus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/axios"; // Import the configured axios instance
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";

// Define types
interface User {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  department: string | null;
}

interface UserApiResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Form validation schema for creating/editing users
const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email("Invalid email").optional().nullable(),
  role: z.string().min(1, "Role is required"),
  department: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof userFormSchema>;

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Table state for pagination and sorting
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState<string>("username");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const addForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "Encoder", // Default role
      department: "",
      isActive: true,
    },
  });

  const editForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "",
      department: "",
      isActive: true,
    },
  });

  // Fetch users with pagination, sorting and search
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (sortField) params.append("sortField", sortField);
      if (sortDirection) params.append("sortDirection", sortDirection);
      if (searchQuery) params.append("search", searchQuery);

      console.log(
        "Fetching users with params:",
        Object.fromEntries(params.entries())
      );

      const response = await api.get<UserApiResponse>(
        `/api/admin/users?${params.toString()}`
      );
      console.log("Fetched users:", response.data);

      setUsers(response.data.users || []);
      setTotalItems(response.data.pagination?.total || 0);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch users");
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch users when pagination, sorting or search changes
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sortField, sortDirection, searchQuery]);

  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    console.log(`Sorting by ${field} in ${direction} order`);
    setSortField(field);
    setSortDirection(direction);
  };

  const handleSearchChange = (value: string) => {
    console.log("Search query:", value);
    setSearchQuery(value);
    setPage(1); // Reset to first page on new search
  };

  const handlePageChange = (newPage: number) => {
    console.log("Changing to page:", newPage);
    setPage(newPage);
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    console.log("Changing items per page to:", newLimit);
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  };

  const handleAddUser = async (data: UserFormValues) => {
    console.log("Adding user:", data);
    try {
      // Ensure password is provided for new users
      if (!data.password) {
        toast({
          title: "Validation Error",
          description: "Password is required for new users",
          variant: "destructive",
        });
        return;
      }

      const response = await api.post<User>("/api/admin/users", data);
      console.log("User added:", response.data);

      // Refresh the users list
      fetchUsers();

      // Reset form and close dialog
      addForm.reset();
      setIsAddDialogOpen(false);

      toast({
        title: "Success",
        description: "User added successfully",
      });
    } catch (err: any) {
      console.error("Error adding user:", err);
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to add user",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = async (data: UserFormValues) => {
    if (!selectedUser) return;

    console.log("Updating user:", data);
    try {
      const response = await api.put<User>(
        `/api/admin/users/${selectedUser.id}`,
        data
      );
      console.log("User updated:", response.data);

      // Refresh the users list
      fetchUsers();

      // Reset form and close dialog
      editForm.reset();
      setIsEditDialogOpen(false);
      setSelectedUser(null);

      toast({
        title: "Success",
        description: "User updated successfully",
      });
    } catch (err: any) {
      console.error("Error updating user:", err);
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    console.log("Deactivating user:", selectedUser.id);
    try {
      await api.delete(`/api/admin/users/${selectedUser.id}`);

      // Refresh the users list
      fetchUsers();

      setIsDeleteDialogOpen(false);
      setSelectedUser(null);

      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
    } catch (err: any) {
      console.error("Error deactivating user:", err);
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to deactivate user",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);

    // Set form values but without password (leave it empty as it's optional for updates)
    editForm.reset({
      username: user.username,
      password: "", // Leave password empty for edits
      name: user.name || "",
      email: user.email || "",
      role: user.role,
      department: user.department || "",
      isActive: user.isActive,
    });

    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Define columns for the DataTable
  const columns: Column<User>[] = [
    {
      key: "username",
      header: "Username",
      sortable: true,
      searchable: true,
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      searchable: true,
      render: (user) => user.name || "-",
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      searchable: true,
      render: (user) => user.email || "-",
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      searchable: true,
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      searchable: true,
      render: (user) => user.department || "-",
    },
    {
      key: "isActive",
      header: "Status",
      sortable: true,
      render: (user) => (
        <Badge
          variant={user.isActive ? "outline" : "destructive"}
          className={user.isActive ? "bg-green-100 text-green-800" : ""}
        >
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (user) =>
        user.createdAt ? format(new Date(user.createdAt), "PPP") : "-",
    },
    {
      key: "lastLogin",
      header: "Last Login",
      sortable: true,
      render: (user) =>
        user.lastLogin ? format(new Date(user.lastLogin), "PPP") : "Never",
    },
    {
      key: "actions",
      header: "Actions",
      render: (user) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditDialog(user)}
            className="text-blue-600 hover:text-blue-900"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {user.isActive && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openDeleteDialog(user)}
              className="text-red-600 hover:text-red-900"
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="py-6">
        <PageHeader
          title="User Management"
          description="Manage user accounts and permissions"
          searchPlaceholder="Search by username, name, email, etc..."
          searchValue={searchQuery}
          onSearchChange={(e) => handleSearchChange(e.target.value)}
          actions={
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          }
        />

        <DataTable
          data={users}
          columns={columns}
          keyField="id"
          isLoading={loading}
          error={error || undefined}
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search users..."
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalItems,
            itemsPerPage: limit,
            onPageChange: handlePageChange,
            onItemsPerPageChange: handleItemsPerPageChange,
          }}
          emptyMessage="No users found."
          hideSearch={true} // We're using the PageHeader search instead
        />

        {/* Add User Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form
                onSubmit={addForm.handleSubmit(handleAddUser)}
                className="space-y-4"
              >
                <FormField
                  control={addForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username*</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password*</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter full name"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter email"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Encoder">Encoder</SelectItem>
                          <SelectItem value="Viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter department"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit">Add User</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit(handleEditUser)}
                className="space-y-4"
              >
                <FormField
                  control={editForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter username"
                          {...field}
                          disabled
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Password (leave empty to keep current)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter new password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter full name"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter email"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role*</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Encoder">Encoder</SelectItem>
                          <SelectItem value="Viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter department"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          aria-label="User active status"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Allow this user to log in and use the system
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit">Update User</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Deactivate User</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>
                Are you sure you want to deactivate {selectedUser?.username}?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This will prevent the user from logging in, but all their data
                will be preserved.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

export default withAdminAuth(UserManagement);
