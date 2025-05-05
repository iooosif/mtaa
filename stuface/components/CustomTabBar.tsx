import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform, Text } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContex';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Custom Tab Bar component with theme support
 */
export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Only show these tabs in the bar
  const mainTabs = ['home', 'search', 'create', 'chat', 'profile'];

  // Get styles with theme
  const styles = getStyles(theme, insets);

  return (
    <View style={styles.container}>
      {mainTabs.map((route, index) => {
        // Find the actual index in the state.routes array
        const tabIndex = state.routes.findIndex(r => r.name === route);
        const isFocused = tabIndex === state.index;

        const onPress = () => {
          if (tabIndex !== -1) {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[tabIndex].key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route);
            }
          } else {
            // Handle the case where the tab isn't in state.routes
            navigation.navigate(route);
          }
        };

        const iconName = getIconName(route, isFocused);

        return (
          <TouchableOpacity
            key={route}
            style={styles.tabButton}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
          >
            <Ionicons
              name={iconName}
              size={24}
              color={isFocused ? theme.colors.primary : "#8E8E93"}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Get icon name based on route and active state
const getIconName = (routeName: string, isFocused: boolean): any => {
  switch (routeName) {
    case 'home':
      return isFocused ? "home" : "home-outline";
    case 'search':
      return isFocused ? "search" : "search-outline";
    case 'create':
      return isFocused ? "add-circle" : "add-circle-outline";
    case 'chat':
      return isFocused ? "chatbubbles" : "chatbubbles-outline";
    case 'profile':
      return isFocused ? "person" : "person-outline";
    default:
      return "help-circle-outline";
  }
};

// Generate styles with theme and safe area insets
const getStyles = (theme: any, insets: any) => StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: "#D1D1D6",
    justifyContent: "space-around",
    alignItems: "center",
    height: Platform.OS === 'ios' ? 50 + insets.bottom : 60,
    paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
    width: '100%',
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingTop: 5,
  }
});
