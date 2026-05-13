import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.278a38730a05470cadf4f07c6f34da50',
  appName: 'AgroEye',
  webDir: 'dist',
  server: {
    url: 'https://278a3873-0a05-470c-adf4-f07c6f34da50.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#F5F5DC",
      showSpinner: false,
    },
  },
};

export default config;
