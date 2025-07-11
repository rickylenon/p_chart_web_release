import { useState } from 'react';
import { useRouter } from 'next/router';
import { UserSession } from '@/lib/clientAuth';
import { useToast } from '@/components/ui/use-toast';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function POSearchHandler() {
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    
    setIsSearching(true);
    console.log('Searching for PO:', searchValue);
    
    try {
      // Quick check if PO exists using HEAD request (lightweight)
      const response = await fetch(`/api/production-orders/exists/${searchValue}`, {
        method: 'HEAD',
        headers: UserSession.getAuthHeaders()
      });
      
      console.log('PO search response status:', response.status);
      
      if (response.status === 404) {
        // PO doesn't exist - redirect to create page
        console.log('PO not found, redirecting to create page');
        toast({
          title: "PO Not Found",
          description: `Creating new production order: ${searchValue}`,
          duration: 3000,
        });
        router.push(`/production-orders/create?initialPoNumber=${searchValue}`);
      } else if (response.ok) {
        // PO exists - redirect to details page
        console.log('PO found, redirecting to details page');
        router.push(`/production-orders/${searchValue}`);
      } else {
        // Handle other errors
        console.error('Error searching for PO:', response.status);
        toast({
          title: "Error",
          description: "Failed to search for production order",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error during PO search:', error);
      toast({
        title: "Error",
        description: "An error occurred while searching",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative w-full">
        <Input
          type="text"
          placeholder="Search PO Number"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full pr-14 border-primary/30 focus-visible:ring-primary/20 rounded-[5px] text-gray-600 placeholder:text-gray-500 placeholder:font-normal"
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          <Button 
            type="submit" 
            size="icon"
            variant="ghost"
            disabled={isSearching}
            className="h-8 w-8 rounded-full hover:bg-transparent"
          >
            {isSearching ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Search className="h-5 w-5 text-gray-400" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
} 