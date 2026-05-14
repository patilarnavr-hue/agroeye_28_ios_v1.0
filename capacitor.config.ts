import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ios.app',
  appName: 'agroeye_28_ios_v1.0',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    backgroundColor: '#F5F0E8',
    limitsNavigationsToAppBoundDomains: false,
    scrollEnabled: true,
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#F5F0E8',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
      backgroundColor: '#00000000',
    },
    Keyboard: {
      resize: 'native',
      style: 'DEFAULT',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
