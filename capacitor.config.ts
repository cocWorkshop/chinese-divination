import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chinese.divination',
  appName: 'Chinese Divination',
  // Load from remote server — web updates auto-propagate without repackaging
  server: {
    url: 'https://chinese-divination.com',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // we'll hide manually after page loads
      backgroundColor: '#0a0f1e',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0f1e',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
