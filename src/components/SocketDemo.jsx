import { useState, useEffect, useCallback, useRef } from 'react';
import useSocket from '../hooks/useSocket';
import { useNotification } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, MessageSquare, AlertCircle } from 'lucide-react';

export default function SocketDemo() {
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('system');
  const [targetOption, setTargetOption] = useState('self'); // 'self', 'role', 'all'
  const [targetRole, setTargetRole] = useState('admin');
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  
  // Track if handlers are already registered to prevent duplicate registrations
  const handlersRegisteredRef = useRef(false);
  
  // Use both the socket hook and notification context
  const { isConnected, isInitializing, subscribe, emit } = useSocket();
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    markAsRead, 
    registerNotificationHandler 
  } = useNotification();

  // Fetch notifications just once on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 100); // Slight delay to avoid render cascade
    
    return () => clearTimeout(timer);
  }, []);

  // Define message handlers with useCallback to prevent recreation on each render
  const handleSystemNotification = useCallback((notification) => {
    console.log('Custom handler for system notification:', notification);
    setMessages(prev => [
      ...prev,
      { 
        id: notification.id, 
        type: 'system', 
        text: `${notification.title}: ${notification.message}`, 
        timestamp: new Date() 
      }
    ]);
  }, []);
  
  const handleMessageNotification = useCallback((notification) => {
    console.log('Custom handler for message notification:', notification);
    setMessages(prev => [
      ...prev,
      { 
        id: notification.id, 
        type: 'message', 
        text: `${notification.title}: ${notification.message}`, 
        timestamp: new Date() 
      }
    ]);
  }, []);
  
  const handleDefectEditNotification = useCallback((notification) => {
    console.log('Custom handler for defect-edit notification:', notification);
    setMessages(prev => [
      ...prev,
      { 
        id: notification.id, 
        type: 'defect-edit', 
        text: `${notification.title}: ${notification.message}`, 
        timestamp: new Date() 
      }
    ]);
  }, []);

  // Register custom notification handlers once on mount or when connection changes
  useEffect(() => {
    if (!isConnected || handlersRegisteredRef.current) return;
    
    // Mark handlers as registered to prevent duplicate registrations
    handlersRegisteredRef.current = true;

    // Register handlers for different notification types
    registerNotificationHandler('system', handleSystemNotification);
    registerNotificationHandler('message', handleMessageNotification);
    registerNotificationHandler('defect-edit', handleDefectEditNotification);
    
    console.log('SocketDemo: Notification handlers registered');
    
    // Cleanup when component unmounts
    return () => {
      // Reset handlers to defaults on unmount
      registerNotificationHandler('system', undefined);
      registerNotificationHandler('message', undefined);
      registerNotificationHandler('defect-edit', undefined);
      handlersRegisteredRef.current = false;
      console.log('SocketDemo: Notification handlers unregistered');
    };
  }, [isConnected]);

  // Handle sending a test notification with debounce to prevent multiple submissions
  const handleSendNotification = useCallback(async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) return;
    
    console.log('Sending notification:', {
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      targetOption,
      targetRole
    });
    
    try {
      // Prepare request body based on target option
      const requestBody = {
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        linkUrl: '/socket-demo'
      };
      
      // Add targeting parameters based on selection
      if (targetOption === 'role') {
        requestBody.targetRole = targetRole;
      } else if (targetOption === 'all') {
        requestBody.emitToAll = true;
      }
      
      // Create notification via API
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Notification created:', data);
        
        // Clear form
        setNotificationTitle('');
        setNotificationMessage('');
      } else {
        console.error('Failed to create notification');
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }, [notificationTitle, notificationMessage, notificationType, targetOption, targetRole]);

  // Get icon for notification type - memoize to prevent recreating on every render
  const getTypeIcon = useCallback((type) => {
    switch (type) {
      case 'system':
        return <AlertCircle className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'defect-edit':
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  }, []);

  // Get color for notification type - memoize to prevent recreating on every render
  const getTypeColor = useCallback((type) => {
    switch (type) {
      case 'system':
        return 'bg-blue-100 text-blue-800';
      case 'message':
        return 'bg-green-100 text-green-800';
      case 'defect-edit':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto my-8 p-4">
      <h2 className="text-2xl font-bold mb-4">Notification Test Console</h2>
      
      {/* Connection status */}
      <div className="mb-4 flex items-center">
        <div
          className={`w-3 h-3 rounded-full mr-2 ${
            isInitializing ? 'bg-yellow-500' : isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span>
          {isInitializing ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
        </span>
        
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm">Unread:</span>
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Defect: {unreadCount.byType['defect-edit'] || 0}
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            System: {unreadCount.byType['system'] || 0}
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Message: {unreadCount.byType['message'] || 0}
          </Badge>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="create">Create Notifications</TabsTrigger>
          <TabsTrigger value="view">
            View Notifications
            {unreadCount.total > 0 && (
              <Badge className="ml-2 bg-red-500 text-white" variant="secondary">
                {unreadCount.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Test Notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Notification Type</label>
                <Select 
                  value={notificationType} 
                  onValueChange={setNotificationType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="defect-edit">Defect Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Target Audience</label>
                <Select 
                  value={targetOption} 
                  onValueChange={setTargetOption}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Only Me</SelectItem>
                    <SelectItem value="role">User Role</SelectItem>
                    <SelectItem value="all">All Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {targetOption === 'role' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Target Role</label>
                  <Select 
                    value={targetRole} 
                    onValueChange={setTargetRole}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="encoder">Encoder</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <Input
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Notification title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <Textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Notification message"
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSendNotification}
                disabled={!isConnected || !notificationTitle.trim() || !notificationMessage.trim()}
              >
                Send Notification
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Real-time Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-60 overflow-y-auto border rounded p-2">
                {messages.length === 0 ? (
                  <p className="text-gray-400 text-center mt-20">No events yet</p>
                ) : (
                  <ul className="space-y-2">
                    {messages.map((msg, index) => (
                      <li
                        key={msg.id || index}
                        className="p-2 border rounded-md"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{msg.text}</span>
                          <Badge className={getTypeColor(msg.type)}>
                            <span className="flex items-center gap-1">
                              {getTypeIcon(msg.type)}
                              {msg.type}
                            </span>
                          </Badge>
                        </div>
                        <small className="text-xs text-gray-500">
                          {msg.timestamp.toLocaleTimeString()}
                        </small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="view">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Your Notifications</CardTitle>
              {unreadCount.total > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => markAsRead(undefined, undefined, true)}
                >
                  Mark all as read
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No notifications yet</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`p-3 border rounded-md ${!notification.isRead ? 'bg-muted/30' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium">{notification.title}</h3>
                          <Badge className={getTypeColor(notification.type)}>
                            <span className="flex items-center gap-1">
                              {getTypeIcon(notification.type)}
                              {notification.type}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-sm mt-1">{notification.message}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                          {!notification.isRead && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="secondary" 
                onClick={() => fetchNotifications()}
                size="sm"
              >
                Refresh
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 