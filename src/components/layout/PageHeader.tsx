import React, { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PageHeaderProps {
  title: string;
  description?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  actions?: ReactNode;
}

/**
 * PageHeader - A consistent header component for all main pages
 * 
 * @param title - The page title
 * @param description - Optional description text shown below title
 * @param searchPlaceholder - Placeholder text for search input
 * @param searchValue - Current search input value
 * @param onSearchChange - Handler for search input changes
 * @param actions - Optional actions to display on the right (buttons, etc)
 */
const PageHeader = ({
  title,
  description,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  actions,
}: PageHeaderProps) => {
  console.log(`PageHeader: Rendering for ${title}`);
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-purple-700">{title}</h1>
          {description && (
            <p className="text-gray-600 mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {onSearchChange && (
            <div className="relative w-96">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                className="pl-8"
                value={searchValue}
                onChange={onSearchChange}
              />
            </div>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
};

export default PageHeader; 