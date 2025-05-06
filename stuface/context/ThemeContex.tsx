import React, { createContext, useContext, useState, useEffect } from 'react';
import { lightTheme, darkTheme } from '@/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext({
    theme: lightTheme,
    toggleTheme: () => {}
});

export const ThemeProvider = ({ children }: { children: React.ReactNode}) => {
    const [theme, setTheme] = useState(lightTheme);
    const [isLoading, setIsLoading] = useState(true);

    // Load theme from AsyncStorage when app starts
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('appTheme');
                if (savedTheme === 'dark') {
                    setTheme(darkTheme);
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

    // Toggle theme and save to AsyncStorage
    const toggleTheme = async () => {
        const newTheme = theme === lightTheme ? darkTheme : lightTheme;
        setTheme(newTheme);

        try {
            // Save theme preference
            await AsyncStorage.setItem('appTheme', newTheme === darkTheme ? 'dark' : 'light');
        } catch (error) {
            console.error('Failed to save theme', error);
        }
    };

    if (isLoading) {
        // You could return a loading indicator here if needed
        return null;
    }

    return (
        <ThemeContext.Provider value={{theme, toggleTheme}}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
