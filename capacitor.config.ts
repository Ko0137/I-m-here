import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cinesync.mobile',
  appName: 'CineSync',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
