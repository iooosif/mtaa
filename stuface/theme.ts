export const lightTheme = {
    colors: {
        background: require('@/assets/images/NormalBackground.png'),
        primary: "rgba(48,78,153, 1.0)",
        secondary: "rgba(81, 130, 255, 1.0)",
        terniary: "rgba(178, 229, 235, 1.0)",
        border: "rgba(255, 255, 255, 0.2)",
        text: "#ffffff",
        back: "#5182FF",
        icons: "#000000",
        alert: "rgba(255,255,255,1)",
        alertText: "rgb(0, 0, 0)",
        taskBar: "rgba(179, 229, 235, 1.0)",
    },
    dark: false,
    highContrast: false,
};

export const darkTheme = {
    colors: {
        background: require('@/assets/images/DarkModeBackground.png'),
        primary: "rgba(137,138,141,1.0)",
        secondary: "rgba(80, 85, 92, 1.0)",
        terniary: "rgba(150, 150, 141, 1.0)",
        border: "rgba(255, 255, 255, 0.2)",
        text: "#ffffff",
        back: "#5182FF",
        icons: "#000000",
        alert: "rgba(80, 85, 92, 1)",
        alertText: "#fffffff",
        taskBar: "rgba(80, 85, 92, 1.0)",
    },
    dark: true,
    highContrast: false,
};

// Add high contrast themes
export const highContrastLightTheme = {
    colors: {
        background: require('@/assets/images/NormalBackground.png'), // Keep same background
        primary: "#000000", // Black
        secondary: "#000080", // Navy
        terniary: "#0000FF", // Blue
        border: "#000000", // Black
        text: "#FFFFFF", // White
        back: "#000000", // Black
        icons: "#FFFFFF", // White
        alert: "#FFFFFF",
        alertText: "#000000", // Black
        taskBar: "#000080", // Navy
    },
    dark: false,
    highContrast: true,
};

export const highContrastDarkTheme = {
    colors: {
        background: require('@/assets/images/DarkModeBackground.png'), // Keep same background
        primary: "#FFFFFF", // White
        secondary: "#FFFF00", // Yellow
        terniary: "#00FFFF", // Cyan
        border: "#FFFFFF", // White
        text: "#FFFFFF", // White
        back: "#FFFF00", // Yellow
        icons: "#000000", // Black
        alert: "#FFFF00", // Yellow
        alertText: "#000000", // Black
        taskBar: "#FFFF00", // Yellow
    },
    dark: true,
    highContrast: true,
};
