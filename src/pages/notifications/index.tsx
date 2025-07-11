import { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { withAuth } from '@/lib/clientAuth';
import api from '@/lib/axios';
import dateFormat from 'dateformat';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/layout/PageHeader';
import { Search, Bell, ClipboardCheck, ExternalLink, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

import Navigation from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DataTable, Column } from '@/components/shared/DataTable';
import { useNotification, Notification } from '@/contexts/NotificationContext';

// Interface for user data
interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
}

const NotificationsPage: NextPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEncoder, setIsEncoder] = useState(false);

  // State for notification detail modal
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Add the notification context
  const { notifications, unreadCount, fetchNotifications, markAsRead, emit, isConnected } = useNotification();

  // Add state for sorting
  const [sortField, setSortField] = useState<string | undefined>("createdAt");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Get current user on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        console.log('Fetching current user info');
        const response = await api.get('/api/me');
        
        if (response.data) {
          const userData = response.data as UserData;
          setCurrentUser(userData);
          const userRole = userData.role.toLowerCase();
          setIsAdmin(userRole === 'admin');
          setIsEncoder(userRole === 'encoder');
          console.log('Current user:', userData, 'isAdmin:', userRole === 'admin', 'isEncoder:', userRole === 'encoder');
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Update useEffect to load all notifications
  useEffect(() => {
    // Fetch notifications when the page loads
    console.log('Notifications page: Calling fetchNotifications()');
    fetchNotifications();
    setIsLoading(false);
  }, [fetchNotifications]);

  // Add debugging logs in a separate effect that won't cause infinite loops
  useEffect(() => {
    console.log('Current notifications array length:', notifications.length);
    console.log('Current notifications array:', notifications);
    console.log('Unread count:', unreadCount);
  }, [notifications, unreadCount]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const navigateToOperationDefectsEditRequests = () => {
    router.push('/operation-defects-edit-requests');
  };

  // Handle sort changes
  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    console.log(`Sorting by ${field} ${direction}`);
    setSortField(field);
    setSortDirection(direction);
  };

  // Open notification detail modal
  const handleViewNotificationDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailModalOpen(true);
    
    // Mark notification as read when viewed
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  // Navigate to the notification link
  const handleNavigateToLink = () => {
    if (selectedNotification?.linkUrl) {
      // Construct the URL by combining the linkUrl with sourceId (if available)
      let targetUrl = selectedNotification.linkUrl;
      
      // If there's a sourceId, append it as a hash
      if (selectedNotification.sourceId) {
        console.log(`Adding sourceId ${selectedNotification.sourceId} to linkUrl ${targetUrl}`);
        targetUrl = `${targetUrl}#${selectedNotification.sourceId}`;
      }
      
      console.log(`Navigating to: ${targetUrl}`);
      router.push(targetUrl);
      setIsDetailModalOpen(false);
    }
  };

  // Calculate pagination
  const filteredNotifications = notifications.filter(notification => 
    notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notification.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  
  const handlePageChange = (page: number) => {
    console.log(`Changing to page ${page}`);
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (perPage: number) => {
    console.log(`Changing items per page to ${perPage}`);
    setItemsPerPage(perPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const notificationColumns: Column<Notification>[] = [
    {
      key: "status",
      header: "",
      render: (item: Notification) => (
        <div className="flex items-center justify-center w-10">
          {!item.isRead && (
            <div className="h-2 w-2 rounded-full bg-primary" title="Unread notification" />
          )}
        </div>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (item: Notification) => (
        <div 
          className={`font-medium ${!item.isRead ? 'text-primary' : ''} cursor-pointer hover:underline`}
          onClick={() => handleViewNotificationDetail(item)}
        >
          {item.title}
        </div>
      ),
    },
    {
      key: "message",
      header: "Message",
      render: (item: Notification) => (
        <div 
          className="max-w-md truncate cursor-pointer hover:text-primary" 
          title={item.message}
          onClick={() => handleViewNotificationDetail(item)}
        >
          {item.message}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (item: Notification) => (
        <Badge variant="outline" className="text-xs">
          {item.type}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      render: (item: Notification) => (
        <span className="text-muted-foreground text-sm">
          {dateFormat(new Date(item.createdAt), "mmm d, yyyy h:MM TT")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: Notification) => (
        <div className="flex items-center gap-2">
          {!item.isRead && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markAsRead(item.id)}
            >
              Mark as read
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewNotificationDetail(item)}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Head>
        <title>Notifications | P-Chart</title>
      </Head>
      <div className="py-6">
        <PageHeader 
          title="Notifications" 
          description="View and manage your notifications in one place"
          searchPlaceholder="Search notifications..."
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          actions={
            (isAdmin || isEncoder) && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="default" 
                  onClick={navigateToOperationDefectsEditRequests}
                  className="flex items-center gap-1.5"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span>Operation Defects Edit Requests</span>
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )
          }
        />
        
        <Card className="mt-6">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>You don&apos;t have any notifications at this time.</p>
                  </div>
                ) : (
                  <DataTable
                    data={filteredNotifications}
                    columns={notificationColumns}
                    keyField="id"
                    isLoading={isLoading}
                    error=""
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSortChange={handleSortChange}
                    pagination={{
                      currentPage,
                      totalPages,
                      totalItems: filteredNotifications.length,
                      itemsPerPage,
                      onPageChange: handlePageChange,
                      onItemsPerPageChange: handleItemsPerPageChange
                    }}
                    emptyMessage="No notifications found."
                  />
                )}
                
                {filteredNotifications.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsRead(undefined, undefined, true)}
                    >
                      Mark all as read
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedNotification?.title}</DialogTitle>
              <DialogDescription>
                {selectedNotification?.type && (
                  <Badge variant="outline" className="mt-2">
                    {selectedNotification.type}
                  </Badge>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Date</Label>
                <p>
                  {selectedNotification?.createdAt 
                    ? dateFormat(new Date(selectedNotification.createdAt), "mmmm d, yyyy h:MM:ss TT")
                    : "N/A"}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-muted-foreground">Message</Label>
                <p className="whitespace-pre-line">{selectedNotification?.message}</p>
              </div>
              
              {selectedNotification?.sourceId && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Reference ID</Label>
                  <p>{selectedNotification.sourceId}</p>
                </div>
              )}
            </div>
            
            <DialogFooter className="sm:justify-between">
              <Button
                variant="ghost"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </Button>
              {selectedNotification?.linkUrl && (
                <Button 
                  variant="default"
                  onClick={handleNavigateToLink}
                  className="flex items-center gap-1.5"
                >
                  View Details
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default withAuth(NotificationsPage); 