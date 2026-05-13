import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.038170b3b0c546e7845fa278e33dab15',
  appName: 'AgroEye',
  webDir: 'dist',
  server: {
    url: 'https://038170b3-b0c5-46e7-845f-a278e33dab15.lovableproject.com?forceHideBadge=true',
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
