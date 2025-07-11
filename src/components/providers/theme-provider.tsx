import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'light',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function getInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    // Check localStorage first
    const storedTheme = localStorage.getItem('theme') as Theme;
    if (storedTheme) {
      console.log('ThemeProvider: Using stored theme:', storedTheme);
      return storedTheme;
    }
    
    // If no stored theme, check system preference
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log('ThemeProvider: Using system preference:', systemPrefersDark ? 'dark' : 'light');
    return systemPrefersDark ? 'dark' : 'light';
  }
  
  return 'light'; // Default for SSR
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        console.log('ThemeProvider: System theme changed to:', e.matches ? 'dark' : 'light');
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Only update DOM and localStorage after initial mount
    if (!isInitialized) return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Store theme preference
    localStorage.setItem('theme', theme);
    console.log('ThemeProvider: Theme changed and stored:', theme);
  }, [theme, isInitialized]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      console.log('ThemeProvider: Setting theme to:', newTheme);
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
}; 