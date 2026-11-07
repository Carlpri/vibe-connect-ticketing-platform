import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeModeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);
const STORAGE_KEY = 'vibe-connect-theme';

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY);
      if (savedMode === 'dark' || savedMode === 'light') return savedMode;

      const previousDashboardMode = localStorage.getItem('organizer-dashboard-theme');
      return previousDashboardMode === 'dark' || previousDashboardMode === 'light'
        ? previousDashboardMode
        : 'light';
    } catch (error) {
      console.error('Could not read theme preference:', error);
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      console.error('Could not save theme preference:', error);
    }
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) throw new Error('useThemeMode must be used inside ThemeModeProvider');
  return context;
}
