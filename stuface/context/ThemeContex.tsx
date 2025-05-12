import React, { createContext, useContext, useState, useEffect } from 'react';
import { lightTheme, darkTheme, highContrastLightTheme, highContrastDarkTheme } from '@/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  theme: typeof lightTheme;
  toggleTheme: () => void;
  toggleHighContrast: () => void;
  isHighContrast: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  toggleTheme: () => {},
  toggleHighContrast: () => {},
  isHighContrast: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState(lightTheme);
  const [isDark, setIsDark] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme settings from AsyncStorage when app starts
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('appTheme');
        const savedContrast = await AsyncStorage.getItem('highContrast');

        const isDarkMode = savedTheme === 'dark';
        const isHighContrastMode = savedContrast === 'true';

        setIsDark(isDarkMode);
        setIsHighContrast(isHighContrastMode);

        // Set the appropriate theme based on both settings
        if (isDarkMode && isHighContrastMode) {
          setTheme(highContrastDarkTheme);
        } else if (isDarkMode) {
          setTheme(darkTheme);
        } else if (isHighContrastMode) {
          setTheme(highContrastLightTheme);
        } else {
          setTheme(lightTheme);
        }
      } catch (error) {
        console.error('Failed to load theme', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Apply theme based on current settings
  const applyTheme = () => {
    if (isDark && isHighContrast) {
      setTheme(highContrastDarkTheme);
    } else if (isDark) {
      setTheme(darkTheme);
    } else if (isHighContrast) {
      setTheme(highContrastLightTheme);
    } else {
      setTheme(lightTheme);
    }
  };

  // Toggle between light and dark themes
  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    try {
      await AsyncStorage.setItem('appTheme', newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme', error);
    }

    // Apply the appropriate theme based on updated settings
    applyTheme();
  };

  // Toggle high contrast mode
  const toggleHighContrast = async () => {
    const newIsHighContrast = !isHighContrast;
    setIsHighContrast(newIsHighContrast);

    try {
      await AsyncStorage.setItem('highContrast', newIsHighContrast ? 'true' : 'false');
    } catch (error) {
      console.error('Failed to save high contrast setting', error);
    }

    // Apply the appropriate theme based on updated settings
    applyTheme();
  };

  if (isLoading) {
    // You could return a loading indicator here if needed
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, toggleHighContrast, isHighContrast }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
