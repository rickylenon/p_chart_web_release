import React from 'react';
import { toast, Toast } from 'react-hot-toast';

interface CompactToastProps {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  t: Toast;
}

export const CompactToast: React.FC<CompactToastProps> = ({ 
  title, 
  message, 
  action, 
  t 
}) => {
  return (
    <div 
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-sm w-full bg-white dark:bg-gray-800 shadow-md rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
    >
      <div className="flex-1 w-0 p-3">
        <div className="flex items-start">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
              {title}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
              {message}
            </p>
          </div>
        </div>
      </div>
      {action && (
        <button
          onClick={() => {
            toast.dismiss(t.id);
            action.onClick();
          }}
          className="p-2 border-l border-gray-200 dark:border-gray-700 text-xs font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export function showCompactToast(
  title: string,
  message: string,
  action?: {
    label: string;
    onClick: () => void;
  },
  options?: {
    duration?: number;
    id?: string;
  }
) {
  return toast.custom(
    (t) => (
      <CompactToast
        title={title}
        message={message}
        action={action}
        t={t}
      />
    ),
    {
      duration: options?.duration || 4000,
      id: options?.id,
    }
  );
} 