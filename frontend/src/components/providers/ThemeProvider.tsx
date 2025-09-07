'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ColorScheme = 'pastel_pink' | 'lavender_mint' | 'sunset_peach' | 'ocean_breeze';

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const colorSchemes = {
  pastel_pink: {
    primary: '#FFE4E6',
    primaryDark: '#FECACA',
    secondary: '#E0E7FF',
    secondaryDark: '#C7D2FE',
    accent: '#DDD6FE',
    accentDark: '#C4B5FD',
    gradient: 'linear-gradient(135deg, #FFE4E6 0%, #E0E7FF 100%)',
  },
  lavender_mint: {
    primary: '#E0E7FF',
    primaryDark: '#C7D2FE',
    secondary: '#D1FAE5',
    secondaryDark: '#A7F3D0',
    accent: '#DDD6FE',
    accentDark: '#C4B5FD',
    gradient: 'linear-gradient(135deg, #E0E7FF 0%, #D1FAE5 100%)',
  },
  sunset_peach: {
    primary: '#FED7AA',
    primaryDark: '#FDBA74',
    secondary: '#FFE4E6',
    secondaryDark: '#FECACA',
    accent: '#DDD6FE',
    accentDark: '#C4B5FD',
    gradient: 'linear-gradient(135deg, #FED7AA 0%, #FFE4E6 100%)',
  },
  ocean_breeze: {
    primary: '#BAE6FD',
    primaryDark: '#7DD3FC',
    secondary: '#D1FAE5',
    secondaryDark: '#A7F3D0',
    accent: '#E0E7FF',
    accentDark: '#C7D2FE',
    gradient: 'linear-gradient(135deg, #BAE6FD 0%, #D1FAE5 100%)',
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('pastel_pink');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const savedColorScheme = localStorage.getItem('colorScheme') as ColorScheme;
    
    if (savedTheme) {
      setThemeState(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(prefersDark ? 'dark' : 'light');
    }
    
    if (savedColorScheme) {
      setColorSchemeState(savedColorScheme);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const scheme = colorSchemes[colorScheme];
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Apply color scheme CSS variables
    root.style.setProperty('--color-primary', scheme.primary);
    root.style.setProperty('--color-primary-dark', scheme.primaryDark);
    root.style.setProperty('--color-secondary', scheme.secondary);
    root.style.setProperty('--color-secondary-dark', scheme.secondaryDark);
    root.style.setProperty('--color-accent', scheme.accent);
    root.style.setProperty('--color-accent-dark', scheme.accentDark);
    root.style.setProperty('--gradient-primary', scheme.gradient);
    
    // Update meta theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', scheme.primary);
    }
  }, [theme, colorScheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setColorScheme = (newScheme: ColorScheme) => {
    setColorSchemeState(newScheme);
    localStorage.setItem('colorScheme', newScheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    colorScheme,
    setTheme,
    setColorScheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook to get current color scheme values
export function useColorScheme() {
  const { colorScheme } = useTheme();
  return colorSchemes[colorScheme];
}

// Utility function to get theme-aware colors
export function getThemeColor(colorName: keyof typeof colorSchemes.pastel_pink) {
  const { colorScheme } = useTheme();
  return colorSchemes[colorScheme][colorName];
}