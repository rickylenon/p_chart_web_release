import { useEffect } from 'react';
import SocketDemo from '../components/SocketDemo';

export default function SocketDemoPage() {
  // Initialize Socket.IO when the page loads
  useEffect(() => {
    // Call the Socket API endpoint to initialize Socket.IO
    fetch('/api/socket').catch(console.error);
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8 text-center">WebSocket Demo Page</h1>
      <SocketDemo />
      
      <div className="mt-8 max-w-md mx-auto">
        <h2 className="text-lg font-semibold mb-2">How it works:</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>When you open this page, a WebSocket connection is established</li>
          <li>Type a message and click send to emit a &apos;client-event&apos; to the server</li>
          <li>The server receives the event and emits a &apos;server-event&apos; back</li>
          <li>The component listens for &apos;server-event&apos; and displays the response</li>
        </ol>
        
        <p className="mt-4 text-sm text-gray-600">
          Open multiple browser tabs to see real-time communication between clients.
        </p>
      </div>
    </div>
  );
} 