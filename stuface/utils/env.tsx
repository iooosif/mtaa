import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Replace with your development machine's actual IP address
const LOCAL_MACHINE_IP = '192.168.68.122';

// Check if we're running in development mode
const isDev = __DEV__;

// Detect if we're using Expo's tunnel (may not be reliable in all Expo versions)
const isTunnel = true;

// Configuration object with all our environment-specific URLs
export const ENV = {
  // Flag to manually toggle tunnel mode during development if auto-detection fails
  FORCE_TUNNEL_MODE: false,

  // Computed property to determine if we're using tunnel
  get IS_USING_TUNNEL() {
    return isDev && (isTunnel || this.FORCE_TUNNEL_MODE);
  },

  // REST API base URL
  get API_URL() {
    // Production URL
    if (!isDev) return 'https://your-production-api.com';

    // Development URLs
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to access host machine
      return 'http://10.0.2.2:8080';
    }

    if (Platform.OS === 'ios') {
        // Physical iOS device needs actual IP
        return `http://${LOCAL_MACHINE_IP}:8080`;
    }

    // Fallback to local IP
    return `http://${LOCAL_MACHINE_IP}:8080`;
  },

  // WebSocket URL (following same logic as API but with ws:// protocol)
  get WEBSOCKET_URL() {
    // Production WebSocket URL
    if (!isDev) return 'wss://your-production-api.com';

    // Development WebSocket URLs
    if (Platform.OS === 'android') {
      return 'ws://10.0.2.2:8080';
    }

    if (Platform.OS === 'ios') {
        return `ws://${LOCAL_MACHINE_IP}:8080`;
    }

    // Fallback to local IP
    return `ws://${LOCAL_MACHINE_IP}:8080`;
  },

  // Add more environment-specific configs as needed
  TIMEOUT: 10000,
  ENABLE_LOGS: isDev,
};

// Print configuration in development for debugging
if (isDev) {
  console.log('🔧 Environment Configuration:');
  console.log(`Platform: ${Platform.OS}`);
  console.log(`Development mode: ${isDev}`);
  console.log(`Using tunnel: ${ENV.IS_USING_TUNNEL}`);
  console.log(`API URL: ${ENV.API_URL}`);
  console.log(`WebSocket URL: ${ENV.WEBSOCKET_URL}`);
}
